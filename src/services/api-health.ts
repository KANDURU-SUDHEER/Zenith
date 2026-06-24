/**
 * API Health Service — Mission Control Status Monitor
 *
 * Tracks the health, response time, and last-updated status of every
 * external service that Project Zenith depends on.
 */

export type ServiceStatus = "healthy" | "warning" | "offline";

export interface ServiceHealth {
  name: string;
  id: string;
  status: ServiceStatus;
  responseTime: number; // ms
  lastChecked: Date;
  lastSuccessful: Date | null;
  consecutiveFailures: number;
  message?: string;
}

export interface HealthCheckResult {
  status: ServiceStatus;
  responseTime: number;
  message?: string;
}

// ─── Service Definitions ─────────────────────────────────────────────────────

const SERVICE_CHECKS: Array<{
  id: string;
  name: string;
  check: () => Promise<HealthCheckResult>;
}> = [
  {
    id: "nasa-apod",
    name: "NASA APOD",
    check: async () => {
      const start = performance.now();
      try {
        const res = await fetch("/api/nasa/apod", {
          signal: AbortSignal.timeout(8000),
        });
        const responseTime = Math.round(performance.now() - start);
        if (res.ok) return { status: "healthy", responseTime };
        if (res.status === 429) return { status: "warning", responseTime, message: "Rate limited" };
        return { status: "offline", responseTime, message: `HTTP ${res.status}` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Unreachable" };
      }
    },
  },
  {
    id: "gemini-ai",
    name: "Gemini AI",
    check: async () => {
      const start = performance.now();
      try {
        // Use the proper schema expected by the sky-guide endpoint
        const res = await fetch("/api/ai/sky-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "ping" }),
          signal: AbortSignal.timeout(12000),
        });
        const responseTime = Math.round(performance.now() - start);
        if (res.ok) return { status: "healthy", responseTime };
        if (res.status === 503) return { status: "offline", responseTime, message: "API key missing" };
        return { status: "warning", responseTime, message: `HTTP ${res.status}` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Unreachable" };
      }
    },
  },
  {
    id: "iss-api",
    name: "ISS API",
    check: async () => {
      const start = performance.now();
      try {
        // Use the TLE proxy which internally fetches from CelesTrak stations group
        // (the ISS TLE is fetched from here, so if this works, ISS tracking works)
        const res = await fetch("/api/satellites/tle?group=stations&healthcheck=1", {
          signal: AbortSignal.timeout(10000),
        });
        const responseTime = Math.round(performance.now() - start);
        if (res.ok) {
          const text = await res.text();
          // Check if response contains ISS data
          if (text.includes("ISS") || text.includes("25544") || text.length > 100) {
            return { status: "healthy", responseTime };
          }
          return { status: "warning", responseTime, message: "No ISS data" };
        }
        return { status: "warning", responseTime, message: `HTTP ${res.status}` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Unreachable" };
      }
    },
  },
  {
    id: "celestrak",
    name: "CelesTrak",
    check: async () => {
      const start = performance.now();
      try {
        const res = await fetch("/api/satellites/tle?group=gps-ops", {
          signal: AbortSignal.timeout(10000),
        });
        const responseTime = Math.round(performance.now() - start);
        if (res.ok) return { status: "healthy", responseTime };
        if (res.status === 402) return { status: "warning", responseTime, message: "Rate limited" };
        return { status: "offline", responseTime, message: `HTTP ${res.status}` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Unreachable" };
      }
    },
  },
  {
    id: "nominatim",
    name: "Nominatim",
    check: async () => {
      const start = performance.now();
      try {
        const res = await fetch(
          "https://nominatim.openstreetmap.org/status.php?format=json",
          { signal: AbortSignal.timeout(6000) }
        );
        const responseTime = Math.round(performance.now() - start);
        if (res.ok) return { status: "healthy", responseTime };
        return { status: "warning", responseTime, message: `HTTP ${res.status}` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Unreachable" };
      }
    },
  },
  {
    id: "astronomy-engine",
    name: "Astronomy Engine",
    check: async () => {
      const start = performance.now();
      try {
        // Local computation — always healthy if JS runs
        const { computeSun } = await import("@/services/celestial-engine");
        computeSun({ latitude: 0, longitude: 0 }, new Date());
        const responseTime = Math.round(performance.now() - start);
        return { status: "healthy", responseTime };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Computation error" };
      }
    },
  },
  {
    id: "simulation-clock",
    name: "Simulation Clock",
    check: async () => {
      const start = performance.now();
      try {
        const { useSimulationClock } = await import("@/stores/simulation-clock");
        const state = useSimulationClock.getState();
        const responseTime = Math.round(performance.now() - start);
        const drift = Math.abs(Date.now() - state.simulatedTime.getTime());
        if (state.isLive && drift < 5000) return { status: "healthy", responseTime };
        if (!state.isLive) return { status: "healthy", responseTime, message: "Simulation mode" };
        return { status: "warning", responseTime, message: `Drift: ${Math.round(drift / 1000)}s` };
      } catch {
        return { status: "offline", responseTime: Math.round(performance.now() - start), message: "Store error" };
      }
    },
  },
];

// ─── Health Check Runner ─────────────────────────────────────────────────────

/**
 * Run health checks on all services. Returns a map of service health states.
 */
export async function checkAllServices(
  previousHealth?: Map<string, ServiceHealth>
): Promise<Map<string, ServiceHealth>> {
  const results = new Map<string, ServiceHealth>();

  // Run checks in parallel with stagger (50ms between starts)
  const promises = SERVICE_CHECKS.map(async (service, index) => {
    // Stagger requests by 50ms each to avoid simultaneous spikes
    await new Promise((r) => setTimeout(r, index * 50));

    const prev = previousHealth?.get(service.id);
    try {
      const result = await service.check();
      const health: ServiceHealth = {
        name: service.name,
        id: service.id,
        status: result.status,
        responseTime: result.responseTime,
        lastChecked: new Date(),
        lastSuccessful: result.status === "healthy" ? new Date() : (prev?.lastSuccessful ?? null),
        consecutiveFailures: result.status === "offline" ? (prev?.consecutiveFailures ?? 0) + 1 : 0,
        message: result.message,
      };
      return { id: service.id, health };
    } catch {
      const health: ServiceHealth = {
        name: service.name,
        id: service.id,
        status: "offline",
        responseTime: 0,
        lastChecked: new Date(),
        lastSuccessful: prev?.lastSuccessful ?? null,
        consecutiveFailures: (prev?.consecutiveFailures ?? 0) + 1,
        message: "Check failed",
      };
      return { id: service.id, health };
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.set(result.value.id, result.value.health);
    }
  }

  return results;
}

/**
 * Get aggregate health summary.
 */
export function getHealthSummary(
  services: Map<string, ServiceHealth>
): { healthy: number; warning: number; offline: number; total: number } {
  let healthy = 0;
  let warning = 0;
  let offline = 0;

  for (const [, service] of services) {
    switch (service.status) {
      case "healthy": healthy++; break;
      case "warning": warning++; break;
      case "offline": offline++; break;
    }
  }

  return { healthy, warning, offline, total: services.size };
}
