"use client";

import { useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Satellite, TLEData, SatelliteCategory } from "@/types";
import {
  propagateToTime,
  getInclination,
  getOrbitalPeriod,
  classifyOrbit,
} from "@/services/orbital-propagation";
import { fetchAllTLEData } from "@/services/tle-service";
import {
  useSatelliteStore,
  passesFilter,
} from "@/stores/satellite-store";
import { getSimulationTime } from "@/stores/simulation-clock";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrbitalEngineState {
  satellites: Satellite[];
  filteredSatellites: Satellite[];
  isLoading: boolean;
  error: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TLE_REFRESH_INTERVAL = 180_000;  // 3 minutes — TLE orbital elements don't change fast
const PROPAGATION_INTERVAL = 4_000;   // Recompute positions every 4 seconds
// ISS NORAD ID — excluded from the general satellite renderer (has its own layer)
const ISS_NORAD_ID = 25544;

// ─── External Store ───────────────────────────────────────────────────────────
// Avoids setState on every propagation tick — components subscribe without
// triggering React re-renders on every 4-second update.

let currentSatellites: Satellite[] = [];
const satListeners = new Set<() => void>();

function subscribeSatellites(cb: () => void): () => void {
  satListeners.add(cb);
  return () => satListeners.delete(cb);
}
function getSatellitesSnapshot(): Satellite[] {
  return currentSatellites;
}
const EMPTY_SATELLITES: Satellite[] = [];
function getSatellitesServerSnapshot(): Satellite[] {
  return EMPTY_SATELLITES;
}
function emitSatellites(sats: Satellite[]): void {
  currentSatellites = sats;
  for (const cb of satListeners) cb();
}

// ─── Propagation ─────────────────────────────────────────────────────────────

function categoryToType(category: SatelliteCategory): Satellite["type"] {
  switch (category) {
    case "starlink":
    case "communication":   return "communication";
    case "weather":         return "weather";
    case "gps":             return "navigation";
    case "iss":
    case "scientific":
    case "space-stations":  return "scientific";
    case "military":        return "military";
    case "debris":          return "debris";
    default:                return "other";
  }
}

/**
 * Propagate all TLEs to `time` and return valid satellite positions.
 *
 * Satellites whose SGP4 propagation returns null (decayed orbit, bad TLE) are
 * silently skipped — this is normal and expected for a small fraction of each
 * group.  The count is therefore slightly lower than the raw TLE count.
 */
function propagateAllSatellites(tleData: TLEData[], time?: Date): Satellite[] {
  const now = time ?? new Date();
  const satellites: Satellite[] = [];

  for (const tle of tleData) {
    const pos = propagateToTime(tle, now);
    if (!pos) continue;          // decayed / bad TLE — skip, don't count

    // Altitude sanity check: reject clearly nonsensical values.
    // Legit LEO satellites are 150–2000 km; GEO ~35 786 km; highest tracked ~60 000 km.
    if (pos.altitude < 80 || pos.altitude > 65_000) continue;

    let launchYear: number | undefined;
    const yearStr = tle.line1.substring(9, 11).trim();
    const y = parseInt(yearStr, 10);
    if (!isNaN(y)) launchYear = y > 56 ? 1900 + y : 2000 + y;

    const inclination = getInclination(tle);
    satellites.push({
      id: String(tle.noradId),
      name: tle.name,
      noradId: tle.noradId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude,
      velocity: pos.velocity,
      type: categoryToType(tle.category),
      category: tle.category,
      visible: true,
      inclination,
      period: getOrbitalPeriod(tle),
      orbitType: classifyOrbit(pos.altitude, inclination),
      launchYear,
      lastUpdated: now.getTime(),
    });
  }

  return satellites;
}

// ─── Counts helper ───────────────────────────────────────────────────────────
// Compute category counts from a satellite array — used to keep the sidebar
// counts stable and consistent with the actual propagated set.

function computeCounts(satellites: Satellite[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sat of satellites) {
    counts[sat.category] = (counts[sat.category] ?? 0) + 1;
  }
  return counts;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOrbitalEngine(): OrbitalEngineState {
  const { filters, searchQuery } = useSatelliteStore();

  const tleRef                 = useRef<TLEData[]>([]);
  const propagationTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track last emitted count so we only update the store when it changes — this
  // prevents the sidebar from flickering on every 4-second propagation tick.
  const lastCountRef           = useRef<number>(-1);

  const { data: tleData, isLoading, error, dataUpdatedAt } = useQuery<TLEData[]>({
    queryKey: ["tle-data-all"],
    queryFn: fetchAllTLEData,
    staleTime: TLE_REFRESH_INTERVAL,
    refetchInterval: TLE_REFRESH_INTERVAL,
    retry: 3,
    retryDelay: 5000,
  });

  useEffect(() => {
    if (!tleData || tleData.length === 0) return;
    tleRef.current = tleData;

    // ── Initial propagation (deferred so it doesn't block first paint) ──────
    const idleId = requestIdleCallback(() => {
      const initial = propagateAllSatellites(tleData, getSimulationTime());
      emitSatellites(initial);

      // Only update the store counts when the count actually changes — this
      // prevents spurious re-renders of the sidebar on every 4-second tick.
      // NOTE: compare against lastCountRef, NOT currentSatellites.length, because
      // emitSatellites() already updated currentSatellites by this point.
      if (initial.length !== lastCountRef.current) {
        lastCountRef.current = initial.length;
        const { setCategoryCounts, setTotalCount, setEngineReady, setLastRefresh } =
          useSatelliteStore.getState();
        setCategoryCounts(computeCounts(initial));
        setTotalCount(initial.length);
        setEngineReady(true);
        setLastRefresh(dataUpdatedAt);
      }
    }, { timeout: 2000 });

    // ── Propagation loop ────────────────────────────────────────────────────
    propagationTimerRef.current = setInterval(() => {
      const tle = tleRef.current;
      if (tle.length === 0) return;

      const propagated = propagateAllSatellites(tle, getSimulationTime());
      emitSatellites(propagated);

      // Update store counts only when the total count changes (e.g. after a
      // TLE refresh that adds or removes satellites), not every 4 seconds.
      if (propagated.length !== lastCountRef.current) {
        lastCountRef.current = propagated.length;
        const { setCategoryCounts, setTotalCount } = useSatelliteStore.getState();
        setCategoryCounts(computeCounts(propagated));
        setTotalCount(propagated.length);
      }
    }, PROPAGATION_INTERVAL);

    return () => {
      cancelIdleCallback(idleId);
      if (propagationTimerRef.current) {
        clearInterval(propagationTimerRef.current);
        propagationTimerRef.current = null;
      }
    };
  }, [tleData, dataUpdatedAt]);

  const satellites = useSyncExternalStore(
    subscribeSatellites,
    getSatellitesSnapshot,
    getSatellitesServerSnapshot
  );

  const filteredSatellites = useMemo(
    () => satellites.filter((sat) => passesFilter(sat, filters, searchQuery)),
    [satellites, filters, searchQuery]
  );

  return {
    satellites,
    filteredSatellites,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

// Export for use by OrbitalEngineLayer
export { ISS_NORAD_ID };
