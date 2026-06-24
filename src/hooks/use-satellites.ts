"use client";

import { useQuery } from "@tanstack/react-query";
import type { Satellite, TLEData } from "@/types";
import { CACHE_TIMES } from "@/lib/constants";
import { fetchAllTLEData } from "@/services/tle-service";
import {
  propagateToTime,
  getInclination,
  getOrbitalPeriod,
  classifyOrbit,
  categorizeSatellite,
} from "@/services/orbital-propagation";

/**
 * Satellite data hook using live SGP4 propagation from CelesTrak TLE data.
 * This replaces the old approximate position calculation.
 *
 * Data flow: CelesTrak TLE → satellite.js SGP4 → real positions
 *
 * TLE data is fetched every 3 minutes (orbital elements don't change frequently).
 * Propagation to current time happens every 10 seconds for smooth real-time display.
 */
function propagateSatellites(tleData: TLEData[]): Satellite[] {
  const now = new Date();
  const satellites: Satellite[] = [];

  for (const tle of tleData) {
    const pos = propagateToTime(tle, now);
    if (!pos) continue;

    const inclination = getInclination(tle);
    const period = getOrbitalPeriod(tle);
    const orbitType = classifyOrbit(pos.altitude, inclination);
    const category = categorizeSatellite(tle.name, tle.category);

    // Extract launch year
    let launchYear: number | undefined;
    try {
      const yearStr = tle.line1.substring(9, 11).trim();
      const year = parseInt(yearStr, 10);
      launchYear = year > 56 ? 1900 + year : 2000 + year;
    } catch {
      // ignore
    }

    let type: Satellite["type"] = "other";
    switch (category) {
      case "starlink":
      case "communication":
        type = "communication";
        break;
      case "weather":
        type = "weather";
        break;
      case "gps":
        type = "navigation";
        break;
      case "iss":
      case "scientific":
      case "space-stations":
        type = "scientific";
        break;
      case "military":
        type = "military";
        break;
      case "debris":
        type = "debris";
        break;
    }

    satellites.push({
      id: String(tle.noradId),
      name: tle.name,
      noradId: tle.noradId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude,
      velocity: pos.velocity,
      type,
      category,
      visible: true,
      inclination,
      period,
      orbitType,
      launchYear,
      lastUpdated: now.getTime(),
    });
  }

  return satellites;
}

async function fetchAndPropagate(): Promise<Satellite[]> {
  const tleData = await fetchAllTLEData();
  return propagateSatellites(tleData);
}

export function useSatellites() {
  return useQuery<Satellite[]>({
    queryKey: ["satellites-propagated"],
    queryFn: fetchAndPropagate,
    staleTime: CACHE_TIMES.satellites,
    // NOTE: Disabled refetchInterval — the orbital engine (useOrbitalEngine) handles
    // continuous propagation via its own interval. This hook is only used as a fallback.
    enabled: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 16000),
  });
}
