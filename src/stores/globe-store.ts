"use client";

import { create } from "zustand";

export type GlobeLoadingPhase =
  | "initializing"
  | "terrain"
  | "imagery"
  | "environment"
  | "complete";

interface GlobeState {
  /** Whether the Cesium viewer is fully loaded and ready */
  isReady: boolean;
  /** Current loading phase for the loading screen */
  loadingPhase: GlobeLoadingPhase;
  /** Loading progress from 0 to 100 */
  loadingProgress: number;
  /** Whether the globe is currently animating (flyTo, etc.) */
  isAnimating: boolean;
  /** Whether day/night lighting is enabled */
  lightingEnabled: boolean;
  /** Whether atmosphere rendering is enabled */
  atmosphereEnabled: boolean;
  /** Whether clouds overlay is enabled */
  cloudsEnabled: boolean;
  /** Error state */
  error: string | null;

  setReady: (ready: boolean) => void;
  setLoadingPhase: (phase: GlobeLoadingPhase) => void;
  setLoadingProgress: (progress: number) => void;
  setAnimating: (animating: boolean) => void;
  setLightingEnabled: (enabled: boolean) => void;
  setAtmosphereEnabled: (enabled: boolean) => void;
  setCloudsEnabled: (enabled: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isReady: false,
  loadingPhase: "initializing" as GlobeLoadingPhase,
  loadingProgress: 0,
  isAnimating: false,
  lightingEnabled: true,
  atmosphereEnabled: true,
  cloudsEnabled: true,
  error: null,
};

export const useGlobeStore = create<GlobeState>((set) => ({
  ...initialState,
  setReady: (isReady) => set({ isReady }),
  setLoadingPhase: (loadingPhase) => set({ loadingPhase }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
  setAnimating: (isAnimating) => set({ isAnimating }),
  setLightingEnabled: (lightingEnabled) => set({ lightingEnabled }),
  setAtmosphereEnabled: (atmosphereEnabled) => set({ atmosphereEnabled }),
  setCloudsEnabled: (cloudsEnabled) => set({ cloudsEnabled }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
