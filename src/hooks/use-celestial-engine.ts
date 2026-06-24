"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/location-store";
import { useSimulationClock } from "@/stores/simulation-clock";
import {
  computeCelestialSnapshot,
  type CelestialSnapshot,
  type Observer,
} from "@/services/celestial-engine";

/**
 * Shared celestial engine hook.
 * Single source of truth for Sun, Moon, and planet data.
 * Uses the SIMULATION CLOCK time (not real time).
 *
 * Returns null data when no location is selected — components must handle this.
 * Recomputes every 10 seconds or when observer/time changes.
 * All components consume this same hook — no duplicated calculations.
 */
export function useCelestialEngine() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const simulatedTime = useSimulationClock((s) => s.simulatedTime);

  const observer: Observer | null = useMemo(() => {
    if (!selectedLocation) return null;
    return {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      elevation: 0,
    };
  }, [selectedLocation]);

  // Round time to nearest 30 seconds for query key.
  // Celestial positions (sun/moon/planets) don't meaningfully change in <30s.
  // This reduces unnecessary query invalidations and downstream re-renders.
  const timeKey = Math.floor(simulatedTime.getTime() / 30000);

  const { data, isLoading, dataUpdatedAt } = useQuery<CelestialSnapshot | null>({
    queryKey: ["celestial-snapshot", observer?.latitude, observer?.longitude, timeKey],
    queryFn: () => {
      if (!observer) return null;
      return computeCelestialSnapshot(observer, simulatedTime);
    },
    enabled: !!observer,
    staleTime: 28_000,
    gcTime: 60_000,
    refetchInterval: 30_000,
  });

  return {
    snapshot: data ?? null,
    sun: data?.sun ?? null,
    moon: data?.moon ?? null,
    planets: data?.planets ?? [],
    jupiterMoons: data?.jupiterMoons ?? [],
    observer,
    isLoading,
    hasCustomLocation: !!selectedLocation,
    // Return the raw timestamp number — avoids allocating new Date() every render.
    // Consumers that need a Date should call new Date(lastUpdated).
    lastUpdated: dataUpdatedAt,
  };
}
