"use client";

import { useEffect } from "react";

/**
 * Unregisters any previously installed download-sw.js Service Worker.
 * The SW approach was abandoned because it caused CORS errors.
 * This hook cleans up any stale SW registrations in users' browsers.
 */
export function useDownloadSW(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Find and unregister any download-sw registration still active
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        if (reg.active?.scriptURL.includes("download-sw")) {
          reg.unregister().catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);
}
