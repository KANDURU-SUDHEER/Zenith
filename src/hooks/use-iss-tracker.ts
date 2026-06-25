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

const ISS_TLE_REFRESH_INTERVAL    = 300_000; // 5 min — TLE elements refresh ~2x/day
const ISS_ANIM_PROPAGATE_INTERVAL = 5_000;   // 5 s  — interpolation source update

// ─── External store: animation position (60 fps) ─────────────────────────────
//
// Using useSyncExternalStore with a module-level store bypasses React state
// entirely for the 60fps animation loop. Components that call
// useSyncExternalStore(subscribeISSAnim, ...) get a direct subscription
// without a setState call chain, so ONLY those components re-render —
// no parent, no sibling, no scroll container.
//
// All four functions are EXPORTED so iss-detail-panel.tsx can subscribe
// directly to specific fields without calling useISSTracker() (which returns
// a new object every frame and defeats React.memo on the panel).

export type ISSAnimationState = {
  latitude:  number;
  longitude: number;
  altitude:  number;
  velocity:  number;
  speedKmS:  number;
  speedKmH:  number;
  speedMph:  number;
  timestamp: number;
} | null;

let issAnimState: ISSAnimationState = null;
const issAnimListeners = new Set<() => void>();

export function subscribeISSAnim(callback: () => void): () => void {
  issAnimListeners.add(callback);
  return () => issAnimListeners.delete(callback);
}
export function getISSAnimSnapshot(): ISSAnimationState        { return issAnimState; }
export function getISSAnimServerSnapshot(): ISSAnimationState  { return null; }

function emitISSAnim(state: ISSAnimationState): void {
  issAnimState = state;
  issAnimListeners.forEach((cb) => cb());
}

// ─── External store: next pass (5-minute cadence) ────────────────────────────
//
// Separating nextPass into its own store means the ~60fps animation store
// updates do NOT cause ISSNextPass to re-render. It only re-renders when
// the 5-minute pass prediction recalculates.

let issNextPassState: SatellitePass | null = null;
const issNextPassListeners = new Set<() => void>();

export function subscribeISSNextPass(callback: () => void): () => void {
  issNextPassListeners.add(callback);
  return () => issNextPassListeners.delete(callback);
}
export function getISSNextPassSnapshot(): SatellitePass | null        { return issNextPassState; }
export function getISSNextPassServerSnapshot(): SatellitePass | null  { return null; }

function emitISSNextPass(state: SatellitePass | null): void {
  // Only notify when the value actually changes (reference or nullability)
  if (state === issNextPassState) return;
  issNextPassState = state;
  issNextPassListeners.forEach((cb) => cb());
}

// ─── Hook ────────────────────────────────────────────────────────────────────
//
// useISSTracker() is still used by OrbitalEngineLayer (for orbitPath/trail)
// and by any caller that needs the full ISSData bundle. Components that only
// need live telemetry should call useSyncExternalStore(subscribeISSAnim, ...)
// directly instead of calling this hook.

export function useISSTracker() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const simulatedTime    = useSimulationClock((s) => s.simulatedTime);

  // ── TLE data (5-min refresh) ────────────────────────────────────────────
  const { data: issTle } = useQuery<TLEData | null>({
    queryKey:        ["iss-tle"],
    queryFn:         fetchISSTLE,
    staleTime:       ISS_TLE_REFRESH_INTERVAL,
    refetchInterval: ISS_TLE_REFRESH_INTERVAL,
    retry:           3,
  });

  // ── Orbit path + trail (1-minute cadence) ──────────────────────────────
  const orbitTimeKey = Math.floor(simulatedTime.getTime() / 60_000);

  const orbitPath = useMemo<OrbitPoint[]>(() => {
    if (!issTle) return [];
    return computeFullOrbit(issTle, new Date(orbitTimeKey * 60_000));
  }, [issTle, orbitTimeKey]);

  const trail = useMemo<OrbitPoint[]>(() => {
    if (!issTle) return [];
    return computeOrbitTrail(issTle, new Date(orbitTimeKey * 60_000), 45);
  }, [issTle, orbitTimeKey]);

  // ── Next pass (5-minute cadence) — emitted to external store ───────────
  // Throttled key: only recalculates when location changes OR every 5 min.
  // We also emit into the nextPass external store so ISSNextPass component
  // can subscribe without calling this hook.
  const passTimeKey = Math.floor(simulatedTime.getTime() / 300_000);

  const nextPass = useMemo<SatellitePass | null>(() => {
    if (!issTle || !selectedLocation) {
      return null;
    }
    const pass = predictNextPass(
      issTle,
      selectedLocation.latitude,
      selectedLocation.longitude,
      0,
      5
    );
    return pass;
    // passTimeKey intentionally included — lint suppressed because we want
    // the 5-min bucket throttle, not React's exhaustive-deps rule.
  }, [issTle, selectedLocation, passTimeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit nextPass to the external store in an effect so it never fires
  // during render (which would cause "setState during render" warnings).
  useEffect(() => {
    emitISSNextPass(nextPass ?? null);
  }, [nextPass]);

  // ── Animation loop ──────────────────────────────────────────────────────
  const tleRef           = useRef<TLEData | null>(null);
  const lastPosRef       = useRef<PropagatedPosition | null>(null);
  const nextPosRef       = useRef<PropagatedPosition | null>(null);
  const interpStartRef   = useRef<number>(0);
  const animFrameRef     = useRef<number>(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { tleRef.current = issTle ?? null; }, [issTle]);

  useEffect(() => {
    if (!issTle) return;

    const propagateNext = () => {
      const tle = tleRef.current;
      if (!tle) return;
      const now    = new Date();
      const current = propagateToTime(tle, now);
      const future  = propagateToTime(tle, new Date(now.getTime() + 5_000));
      if (current && future) {
        lastPosRef.current    = current;
        nextPosRef.current    = future;
        interpStartRef.current = Date.now();
      }
    };

    propagateNext();
    const propagateInterval = setInterval(propagateNext, ISS_ANIM_PROPAGATE_INTERVAL);

    const animate = () => {
      const last = lastPosRef.current;
      const next = nextPosRef.current;

      if (last && next) {
        const elapsed  = Date.now() - interpStartRef.current;
        const t        = Math.min(elapsed / 5_000, 1);
        const pos      = interpolatePosition(last, next, t);
        const speedKmS = pos.velocity;
        const speedKmH = speedKmS * 3600;
        const speedMph = speedKmH * 0.621371;

        if (issAnimListeners.size > 0) {
          emitISSAnim({
            latitude:  pos.latitude,
            longitude: pos.longitude,
            altitude:  pos.altitude,
            velocity:  speedKmH,
            speedKmS,
            speedKmH,
            speedMph,
            timestamp: Date.now(),
          });
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // No active subscribers — throttle to ~4 fps to avoid burning CPU
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

  // ── Subscribe to animation state (no setState → no parent re-render) ───
  const animState = useSyncExternalStore(
    subscribeISSAnim,
    getISSAnimSnapshot,
    getISSAnimServerSnapshot
  );

  // Build ISSData. orbitPath/trail/nextPass are stable memoized references —
  // they don't create a new ISSData object on every 60fps animation tick.
  const issData: ISSData | null = animState
    ? {
        latitude:  animState.latitude,
        longitude: animState.longitude,
        altitude:  animState.altitude,
        velocity:  animState.velocity,
        speedKmS:  animState.speedKmS,
        speedKmH:  animState.speedKmH,
        speedMph:  animState.speedMph,
        timestamp: animState.timestamp,
        orbitPath,
        trail,
        nextPass,
      }
    : null;

  return { issData, orbitPath, trail, nextPass, isLoading: !issTle };
}
