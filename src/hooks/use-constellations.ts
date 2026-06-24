"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocationStore } from "@/stores/location-store";
import { useSimulationClock } from "@/stores/simulation-clock";
import type { Constellation } from "@/types";
import { CONSTELLATIONS } from "@/services/constellations-data";
import { CACHE_TIMES } from "@/lib/constants";

/**
 * Determines which constellations are visible from a given location.
 * Uses simplified altitude calculation based on declination and latitude.
 */
function computeVisibleConstellations(
  latitude: number,
  longitude: number,
  date: Date
): Constellation[] {
  // Calculate local sidereal time for visibility
  const jd =
    367 * date.getUTCFullYear() -
    Math.floor(
      (7 * (date.getUTCFullYear() + Math.floor((date.getUTCMonth() + 10) / 12))) / 4
    ) +
    Math.floor((275 * (date.getUTCMonth() + 1)) / 9) +
    date.getUTCDate() +
    1721013.5 +
    date.getUTCHours() / 24;

  const T = (jd - 2451545.0) / 36525.0;
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * 0.000387933;
  gst = ((gst % 360) + 360) % 360;
  const lst = ((gst + longitude) % 360 + 360) % 360;

  return CONSTELLATIONS.map((constellation) => {
    // Check if constellation is above the horizon
    const ha = ((lst - constellation.rightAscension + 360) % 360) * (Math.PI / 180);
    const decRad = (constellation.declination * Math.PI) / 180;
    const latRad = (latitude * Math.PI) / 180;

    const sinAlt =
      Math.sin(decRad) * Math.sin(latRad) +
      Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
    const altitude = Math.asin(sinAlt) * (180 / Math.PI);

    return {
      ...constellation,
      isVisible: altitude > 10, // Above 10° altitude
    };
  });
}

export function useConstellations() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const simulatedTime = useSimulationClock((s) => s.simulatedTime);
  // Update every 60 seconds based on simulation time
  const timeKey = Math.floor(simulatedTime.getTime() / 60000);

  return useQuery<Constellation[]>({
    queryKey: ["constellations", selectedLocation?.latitude, selectedLocation?.longitude, timeKey],
    queryFn: () => {
      if (!selectedLocation) return CONSTELLATIONS;
      return computeVisibleConstellations(
        selectedLocation.latitude,
        selectedLocation.longitude,
        simulatedTime
      );
    },
    staleTime: CACHE_TIMES.constellations,
    refetchInterval: CACHE_TIMES.constellations,
    placeholderData: CONSTELLATIONS,
  });
}
