"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/location-store";
import { computeMoonPosition } from "@/services/astronomy";
import { CACHE_TIMES } from "@/lib/constants";

export function useMoon() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  return useQuery({
    queryKey: ["moon", selectedLocation?.latitude, selectedLocation?.longitude],
    queryFn: () => {
      if (!selectedLocation) return null;
      return computeMoonPosition(
        selectedLocation.latitude,
        selectedLocation.longitude,
        new Date()
      );
    },
    enabled: !!selectedLocation,
    staleTime: CACHE_TIMES.planets,
    refetchInterval: CACHE_TIMES.planets,
  });
}
