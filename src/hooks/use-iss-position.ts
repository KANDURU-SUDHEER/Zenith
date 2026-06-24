"use client";

import { useQuery } from "@tanstack/react-query";
import type { ISSPosition } from "@/types";
import { CACHE_TIMES } from "@/lib/constants";

/**
 * ISS position fetcher (lightweight version for backward compatibility).
 * The full ISS tracker with orbit path, trail, and pass prediction
 * is in use-iss-tracker.ts.
 *
 * Priority: WhereTheISS (HTTPS) → OpenNotify (HTTP fallback) → cached → mock
 */
async function fetchISSPosition(): Promise<ISSPosition> {
  // Primary: WhereTheISS API
  try {
    const response = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`WhereTheISS: ${response.status}`);
    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity,
      timestamp: Date.now(),
    };
  } catch {
    // Secondary: OpenNotify
    try {
      const response = await fetch("http://api.open-notify.org/iss-now.json", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`OpenNotify: ${response.status}`);
      const data = await response.json();
      return {
        latitude: parseFloat(data.iss_position.latitude),
        longitude: parseFloat(data.iss_position.longitude),
        altitude: 408,
        velocity: 27600,
        timestamp: data.timestamp * 1000,
      };
    } catch {
      throw new Error("All ISS APIs unavailable");
    }
  }
}

const PLACEHOLDER_ISS: ISSPosition = {
  latitude: 28.5728,
  longitude: -80.6489,
  altitude: 408,
  velocity: 27600,
  timestamp: Date.now(),
};

export function useISSPosition() {
  return useQuery<ISSPosition>({
    queryKey: ["iss-position"],
    queryFn: fetchISSPosition,
    refetchInterval: CACHE_TIMES.issPosition, // 5 seconds
    staleTime: CACHE_TIMES.issPosition,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    placeholderData: PLACEHOLDER_ISS,
  });
}
