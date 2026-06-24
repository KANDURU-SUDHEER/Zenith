"use client";

import { useCallback, useState } from "react";
import { useLocationStore, type LocationRecord } from "@/stores/location-store";
import { reverseGeocode, estimateTimezone } from "@/lib/geocoding";
import { showToast, dismissAllToasts } from "@/components/ui/toast";

interface UseGeolocationReturn {
  locate: () => void;
  isLocating: boolean;
  error: string | null;
}

export function useGeolocation(): UseGeolocationReturn {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setLocation = useLocationStore((s) => s.setLocation);
  const storeSetLocating = useLocationStore((s) => s.setLocating);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setIsLocating(true);
    storeSetLocating(true);
    setError(null);

    showToast("Fetching your location...", "loading");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // estimateTimezone only needs longitude (offset = longitude / 15)
        const timezone = estimateTimezone(longitude);

        try {
          const geo = await reverseGeocode(latitude, longitude);

          const record: LocationRecord = {
            latitude,
            longitude,
            name: geo.name,
            city: geo.city,
            district: geo.district,
            state: geo.state,
            country: geo.country,
            postalCode: geo.postalCode,
            timezone,
            displayName: geo.displayName,
            source: "browser",
            timestamp: Date.now(),
          };

          setLocation(record);
          dismissAllToasts();
          showToast(`Location set to ${geo.name}`, "location");
        } catch {
          // Reverse geocoding failed — use raw coords
          const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const record: LocationRecord = {
            latitude,
            longitude,
            name: coords,
            timezone,
            displayName: coords,
            source: "browser",
            timestamp: Date.now(),
          };
          setLocation(record);
          dismissAllToasts();
          showToast(`Location set to ${coords}`, "location");
        }

        setIsLocating(false);
        storeSetLocating(false);
      },
      (err) => {
        let message: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Location unavailable. Please try again.";
            break;
          case err.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
          default:
            message = "Could not get your location.";
        }
        setError(message);
        setIsLocating(false);
        storeSetLocating(false);
        dismissAllToasts();
        showToast(message, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  }, [setLocation, storeSetLocating]);

  return { locate, isLocating, error };
}
