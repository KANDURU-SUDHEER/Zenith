"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/stores/location-store";

/**
 * Hydrates the location store from localStorage on mount.
 * Must be rendered inside the app once (e.g., in layout or dashboard shell).
 */
export function LocationHydration() {
  const hydrate = useLocationStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
