"use client";

import { create } from "zustand";

interface AmbientState {
  /** Whether ambient effects are enabled */
  isAmbientOn: boolean;
  /** Normalized mouse X position (0-1) */
  mouseX: number;
  /** Normalized mouse Y position (0-1) */
  mouseY: number;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;

  setAmbientOn: (on: boolean) => void;
  setMousePosition: (x: number, y: number) => void;
  setPrefersReducedMotion: (prefers: boolean) => void;
  toggle: () => void;
}

export const useAmbientStore = create<AmbientState>((set) => ({
  isAmbientOn: true,
  mouseX: 0.5,
  mouseY: 0.5,
  prefersReducedMotion: false,

  setAmbientOn: (isAmbientOn) => set({ isAmbientOn }),
  setMousePosition: (mouseX, mouseY) => set({ mouseX, mouseY }),
  setPrefersReducedMotion: (prefersReducedMotion) => set({ prefersReducedMotion }),
  toggle: () => set((state) => ({ isAmbientOn: !state.isAmbientOn })),
}));
