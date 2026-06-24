"use client";

import { useSyncExternalStore } from "react";

// ─── Per-query stable subscribe/snapshot factory ─────────────────────────────
// useSyncExternalStore requires stable function references to avoid
// re-subscribing on every render. We cache one pair per query string so the
// same hook instance always receives identical function references.

const subscribeCache = new Map<string, (cb: () => void) => () => void>();
const snapshotCache = new Map<string, () => boolean>();

function getSubscribe(query: string): (cb: () => void) => () => void {
  let fn = subscribeCache.get(query);
  if (!fn) {
    fn = (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    };
    subscribeCache.set(query, fn);
  }
  return fn;
}

function getSnapshot(query: string): () => boolean {
  let fn = snapshotCache.get(query);
  if (!fn) {
    fn = () => window.matchMedia(query).matches;
    snapshotCache.set(query, fn);
  }
  return fn;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    getSubscribe(query),
    getSnapshot(query),
    getServerSnapshot
  );
}

export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}

export function useIsTablet(): boolean {
  const isAboveMd = useMediaQuery("(min-width: 768px)");
  const isAboveLg = useMediaQuery("(min-width: 1024px)");
  return isAboveMd && !isAboveLg;
}
