"use client";

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlaybackState = "live" | "playing" | "paused" | "reverse";
export type PlaybackSpeed = 1 | 5 | 10 | 30 | 60 | 600 | 3600 | 86400;

interface SimulationClockState {
  /** Current simulated time (UTC) */
  simulatedTime: Date;
  /** Playback state */
  playbackState: PlaybackState;
  /** Playback speed multiplier */
  speed: PlaybackSpeed;
  /** Whether the clock is in live mode (tracking real time) */
  isLive: boolean;

  // ─── Actions ─────────────────────────────────────────────────────────────
  /** Set simulation time directly (e.g., from timeline drag) */
  setTime: (time: Date) => void;
  /** Jump forward/backward by milliseconds */
  offsetTime: (ms: number) => void;
  /** Set playback state */
  setPlaybackState: (state: PlaybackState) => void;
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Return to live mode (current real time) */
  goLive: () => void;
  /** Pause simulation */
  pause: () => void;
  /** Resume playback */
  play: () => void;
  /** Reverse playback */
  reverse: () => void;
  /** Tick the clock by one frame (called by animation loop) */
  tick: (deltaMs: number) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSimulationClock = create<SimulationClockState>((set, get) => ({
  simulatedTime: new Date(),
  playbackState: "live",
  speed: 1,
  isLive: true,

  setTime: (time) => set({ simulatedTime: time, isLive: false, playbackState: "paused" }),

  offsetTime: (ms) => {
    const { simulatedTime } = get();
    set({
      simulatedTime: new Date(simulatedTime.getTime() + ms),
      isLive: false,
    });
  },

  setPlaybackState: (state) => set({ playbackState: state, isLive: state === "live" }),

  setSpeed: (speed) => set({ speed }),

  goLive: () => set({ simulatedTime: new Date(), playbackState: "live", isLive: true, speed: 1 }),

  pause: () => {
    const { simulatedTime, isLive } = get();
    // Freeze at current real time if coming from live mode
    set({
      playbackState: "paused",
      isLive: false,
      simulatedTime: isLive ? new Date() : simulatedTime,
    });
  },

  play: () => set({ playbackState: "playing", isLive: false }),

  reverse: () => set({ playbackState: "reverse", isLive: false }),

  tick: (deltaMs) => {
    const { playbackState, speed, isLive, simulatedTime } = get();

    if (isLive) {
      // In live mode, only update every second to avoid 60fps re-renders
      const now = new Date();
      if (now.getSeconds() !== simulatedTime.getSeconds()) {
        set({ simulatedTime: now });
      }
      return;
    }

    if (playbackState === "paused") return;

    const direction = playbackState === "reverse" ? -1 : 1;
    const advance = deltaMs * speed * direction;
    set({ simulatedTime: new Date(simulatedTime.getTime() + advance) });
  },
}));

// ─── Hook for simulation time (use this instead of Date.now()) ───────────────

/**
 * Returns the current simulation time.
 * All components should use this instead of `new Date()`.
 * Safe to call outside of React components.
 * Respects pause state — returns frozen time when paused.
 */
export function getSimulationTime(): Date {
  const state = useSimulationClock.getState();
  // When paused, always return the frozen simulated time
  if (state.playbackState === "paused") return state.simulatedTime;
  // In live mode, use current real time for propagation
  if (state.isLive) return new Date();
  return state.simulatedTime;
}
