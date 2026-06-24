"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Returns a ref to attach to a container element.
 * The returned `isVisible` ref is `true` when the element intersects the viewport.
 * Use this to pause/resume animation loops in off-screen landing sections.
 *
 * Usage:
 *   const { containerRef, isVisible } = useVisibilityPause();
 *   // In your RAF loop: if (!isVisible.current) return scheduleNextFrame();
 */
export function useVisibilityPause(threshold = 0.01) {
  const containerRef = useRef<HTMLElement | null>(null);
  const isVisible = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    containerRef.current = node;
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible.current = entry.isIntersecting;
        }
      },
      { threshold }
    );
    observerRef.current.observe(node);
  }, [threshold]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { setRef, isVisible };
}
