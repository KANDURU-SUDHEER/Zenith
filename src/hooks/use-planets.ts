"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/location-store";
import type { Planet } from "@/types";
import { CACHE_TIMES } from "@/lib/constants";
import { computePlanetPositions } from "@/services/astronomy";

export function usePlanets() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  return useQuery<Planet[]>({
    queryKey: ["planets", selectedLocation?.latitude, selectedLocation?.longitude],
    queryFn: () => {
      if (!selectedLocation) return [];
      return computePlanetPositions(
        selectedLocation.latitude,
        selectedLocation.longitude,
        new Date()
      );
    },
    enabled: !!selectedLocation,
    staleTime: CACHE_TIMES.planets,
    refetchInterval: CACHE_TIMES.planets,
    placeholderData: [],
  });
}
