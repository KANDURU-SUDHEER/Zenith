"use client";

import { useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ISSData, OrbitPoint, SatellitePass, TLEData } from "@/types";
import {
  propagateToTime,
  computeFullOrbit,
  computeOrbitTrail,
  predictNextPass,
  interpolatePosition,
  type PropagatedPosition,
} from "@/services/orbital-propagation";
import { fetchISSTLE } from "@/services/tle-service";
import { useLocationStore } from "@/stores/location-store";
import { useSimulationClock } from "@/stores/simulation-clock";

// ─── Constants ───────────────────────────────────────────────────────────────

const ISS_TLE_REFRESH_INTERVAL  = 300_000; // 5 minutes — TLE data is static, refreshes ~2x/day
const ISS_ANIM_PROPAGATE_INTERVAL = 5000;  // 5 seconds — interpolation source propagation

// ─── External Store for Animation (avoid setState in render) ─────────────────

type ISSAnimationState = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  speedKmS: number;
  speedKmH: number;
  speedMph: number;
  timestamp: number;
} | null;

let issAnimState: ISSAnimationState = null;
const issListeners = new Set<() => void>();

function getISSAnimSnapshot(): ISSAnimationState {
  return issAnimState;
}

function getISSAnimServerSnapshot(): ISSAnimationState {
  return null;
}

function subscribeISSAnim(callback: () => void): () => void {
  issListeners.add(callback);
  return () => issListeners.delete(callback);
}

function emitISSAnim(state: ISSAnimationState): void {
  issAnimState = state;
  for (const listener of issListeners) {
    listener();
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useISSTracker() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const simulatedTime = useSimulationClock((s) => s.simulatedTime);

  // Fetch ISS TLE
  const { data: issTle } = useQuery<TLEData | null>({
    queryKey: ["iss-tle"],
    queryFn: fetchISSTLE,
    staleTime: ISS_TLE_REFRESH_INTERVAL,
    refetchInterval: ISS_TLE_REFRESH_INTERVAL,
    retry: 3,
  });

  // Round simulation time to nearest minute for orbit recalculation
  // (avoids blinking from recreating polylines every second)
  const orbitTimeKey = Math.floor(simulatedTime.getTime() / 60000);

  // Compute orbit path (recomputes only once per minute)
  const orbitPath = useMemo<OrbitPoint[]>(() => {
    if (!issTle) return [];
    const time = new Date(orbitTimeKey * 60000);
    return computeFullOrbit(issTle, time);
  }, [issTle, orbitTimeKey]);

  // Compute trail (recomputes only once per minute)
  const trail = useMemo<OrbitPoint[]>(() => {
    if (!issTle) return [];
    const time = new Date(orbitTimeKey * 60000);
    return computeOrbitTrail(issTle, time, 45);
  }, [issTle, orbitTimeKey]);

  // Compute next pass
  const nextPass = useMemo<SatellitePass | null>(() => {
    if (!issTle || !selectedLocation) return null;
    return predictNextPass(
      issTle,
      selectedLocation.latitude,
      selectedLocation.longitude,
      0,
      5
    );
  }, [issTle, selectedLocation]);

  // Animation loop using external store (avoids re-render on every frame)
  const tleRef = useRef<TLEData | null>(null);
  const lastPosRef = useRef<PropagatedPosition | null>(null);
  const nextPosRef = useRef<PropagatedPosition | null>(null);
  const interpStartRef = useRef<number>(0);
  // Use separate refs for RAF handle and throttle-timeout handle so cleanup
  // is always correct — previously both were stored in the same ref, meaning
  // whichever was stored last would cancel the wrong resource type.
  const animFrameRef = useRef<number>(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tleRef.current = issTle ?? null;
  }, [issTle]);

  useEffect(() => {
    if (!issTle) return;

    // Set up propagation targets every 5 seconds
    const propagateNext = () => {
      const tle = tleRef.current;
      if (!tle) return;
      const now = new Date();
      const current = propagateToTime(tle, now);
      const future = propagateToTime(tle, new Date(now.getTime() + 5000));
      if (current && future) {
        lastPosRef.current = current;
        nextPosRef.current = future;
        interpStartRef.current = Date.now();
      }
    };

    propagateNext();
    const propagateInterval = setInterval(propagateNext, ISS_ANIM_PROPAGATE_INTERVAL);

    // 60fps animation loop — only runs while there are active UI subscribers.
    // When no component is subscribed (e.g. on the landing page), the loop
    // reschedules itself at ~4fps to keep positions fresh on resubscription.
    const animate = () => {
      const last = lastPosRef.current;
      const next = nextPosRef.current;

      if (last && next) {
        const elapsed = Date.now() - interpStartRef.current;
        const t = Math.min(elapsed / 5000, 1);
        const pos = interpolatePosition(last, next, t);

        const speedKmS = pos.velocity;
        const speedKmH = speedKmS * 3600;
        const speedMph = speedKmH * 0.621371;

        // Only emit (and wake subscribers) when there are active listeners
        if (issListeners.size > 0) {
          emitISSAnim({
            latitude: pos.latitude,
            longitude: pos.longitude,
            altitude: pos.altitude,
            velocity: speedKmH,
            speedKmS,
            speedKmH,
            speedMph,
            timestamp: Date.now(),
          });
          // Full 60fps when UI is mounted
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // No subscribers — throttle to ~4fps to avoid burning CPU.
          // Store timeout handle in its own ref so cleanup can cancel it
          // independently of the RAF handle.
          throttleTimerRef.current = setTimeout(() => {
            throttleTimerRef.current = null;
            animFrameRef.current = requestAnimationFrame(animate);
          }, 250);
        }
      } else {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(propagateInterval);
      cancelAnimationFrame(animFrameRef.current);
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [issTle]);

  // Subscribe to animation state without setState
  const animState = useSyncExternalStore(
    subscribeISSAnim,
    getISSAnimSnapshot,
    getISSAnimServerSnapshot
  );

  // Build full ISSData
  const issData: ISSData | null = animState
    ? {
        ...animState,
        orbitPath,
        trail,
        nextPass,
      }
    : null;

  return {
    issData,
    orbitPath,
    trail,
    nextPass,
    isLoading: !issTle,
  };
}
