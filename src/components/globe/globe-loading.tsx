"use client";

import { useGlobeStore, type GlobeLoadingPhase } from "@/stores/globe-store";

const PHASE_LABELS: Record<GlobeLoadingPhase, string> = {
  initializing: "Initializing Globe",
  terrain: "Loading Terrain",
  imagery: "Loading Imagery",
  environment: "Preparing Space Environment",
  complete: "Ready",
};

export function GlobeLoading() {
  const { loadingPhase, loadingProgress, isReady } = useGlobeStore();

  if (isReady) return null;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center bg-space-950 transition-opacity duration-700 ${
        loadingProgress >= 100 ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="progressbar"
      aria-valuenow={loadingProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Globe loading progress"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated Earth Icon */}
        <div className="relative h-24 w-24">
          {/* Outer glow ring */}
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cosmic-400/60" style={{ animationDuration: "3s" }} />
          {/* Middle ring */}
          <div className="absolute inset-2 animate-spin rounded-full border border-transparent border-b-nebula-400/40" style={{ animationDuration: "5s", animationDirection: "reverse" }} />
          {/* Inner globe */}
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="relative h-full w-full rounded-full bg-gradient-to-br from-cosmic-500/30 via-space-700 to-space-900 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              {/* Atmosphere glow */}
              <div className="absolute -inset-1 rounded-full bg-cosmic-400/10 blur-md" />
              {/* Surface highlight */}
              <div className="absolute left-2 top-2 h-3 w-3 rounded-full bg-cosmic-300/30 blur-sm" />
            </div>
          </div>
        </div>

        {/* Phase text */}
        <div className="text-center">
          <p className="text-sm font-medium text-star-white/80 transition-all duration-300">
            {PHASE_LABELS[loadingPhase]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48">
          <div className="h-1 w-full overflow-hidden rounded-full bg-space-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cosmic-500 to-nebula-400 transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-star-white/30">
            {loadingProgress}%
          </p>
        </div>
      </div>
    </div>
  );
}
