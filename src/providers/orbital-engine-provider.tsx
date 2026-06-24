"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useOrbitalEngine } from "@/hooks/use-orbital-engine";
import type { Satellite } from "@/types";

// ─── Context ─────────────────────────────────────────────────────────────────

interface OrbitalEngineContextValue {
  satellites: Satellite[];
  filteredSatellites: Satellite[];
  isLoading: boolean;
  error: string | null;
}

const OrbitalEngineContext = createContext<OrbitalEngineContextValue>({
  satellites: [],
  filteredSatellites: [],
  isLoading: true,
  error: null,
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function OrbitalEngineProvider({ children }: { children: ReactNode }) {
  const { satellites, filteredSatellites, isLoading, error } = useOrbitalEngine();

  // Memoize the context value so consumers only re-render when the actual
  // data references change — not on every parent render.
  const value = useMemo<OrbitalEngineContextValue>(
    () => ({ satellites, filteredSatellites, isLoading, error }),
    [satellites, filteredSatellites, isLoading, error]
  );

  return (
    <OrbitalEngineContext.Provider value={value}>
      {children}
    </OrbitalEngineContext.Provider>
  );
}

// ─── Consumer Hook ───────────────────────────────────────────────────────────

export function useOrbitalData(): OrbitalEngineContextValue {
  return useContext(OrbitalEngineContext);
}
