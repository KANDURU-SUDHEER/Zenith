"use client";

import { useEffect, useRef } from "react";
import { useSimulationClock } from "@/stores/simulation-clock";

/**
 * Animation loop that drives the simulation clock.
 * Performance-optimized:
 * - In "live" mode: ticks once per second (not 60fps)
 * - In "playing"/"reverse" mode: ticks at 60fps for smooth simulation
 * - In "paused" mode: no ticking at all
 */
export function useSimulationLoop() {
  const lastFrameRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let running = true;

    // Determine mode and start appropriate loop
    const startLoop = () => {
      stopLoop();
      const { playbackState, isLive } = useSimulationClock.getState();

      if (playbackState === "paused" && !isLive) {
        // Paused — no updates needed
        return;
      }

      if (isLive) {
        // Live mode — update once per second (no need for 60fps)
        intervalRef.current = setInterval(() => {
          if (!running) return;
          useSimulationClock.getState().tick(1000);
        }, 1000);
      } else {
        // Playing/Reverse — need smooth 60fps animation
        lastFrameRef.current = performance.now();
        const animate = () => {
          if (!running) return;
          const now = performance.now();
          const delta = now - lastFrameRef.current;
          lastFrameRef.current = now;
          useSimulationClock.getState().tick(delta);
          animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
      }
    };

    const stopLoop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = 0;
      }
    };

    // Start initial loop
    startLoop();

    // Re-start loop when playback state changes
    const unsubscribe = useSimulationClock.subscribe(
      (state, prevState) => {
        if (
          state.playbackState !== prevState.playbackState ||
          state.isLive !== prevState.isLive
        ) {
          startLoop();
        }
      }
    );

    return () => {
      running = false;
      stopLoop();
      unsubscribe();
    };
  }, []);
}
