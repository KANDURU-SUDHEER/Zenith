"use client";

import { useEffect } from "react";

/**
 * Listens for unhandled chunk load errors (webpack dynamic import failures)
 * that escape ErrorBoundary and reloads the page automatically.
 *
 * These errors look like:
 *   - ChunkLoadError: Loading chunk X failed
 *   - TypeError: Failed to fetch dynamically imported module
 *
 * A page reload is the only reliable fix — the failed chunk URL is permanently
 * cached as failed in the current JS session.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const isChunkError = (msg: string) =>
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch dynamically imported") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("ChunkLoadError");

    const handleError = (event: ErrorEvent) => {
      if (isChunkError(event.message)) {
        console.warn("[ChunkErrorHandler] Chunk load error detected, reloading…", event.message);
        // Small delay so the error boundary can render first if it catches it
        setTimeout(() => window.location.reload(), 2000);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      if (isChunkError(msg)) {
        console.warn("[ChunkErrorHandler] Unhandled chunk promise rejection, reloading…", msg);
        setTimeout(() => window.location.reload(), 2000);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
