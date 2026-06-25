"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  useRadarFilterStore,
  type RadarFilterKey,
} from "@/stores/radar-filter-store";
import { useSatelliteStore } from "@/stores/satellite-store";

// Map from category key → globe filter key (same as in mobile-tools-sidebar)
const GLOBE_KEY_MAP: Record<string, string> = {
  spaceStations: "spaceStations",
  planets:       "planets",
  starlink:      "starlink",
  gps:           "gps",
  communication: "communication",
};

const MAIN_CATEGORIES = [
  { key: "spaceStations" as RadarFilterKey, label: "Space Stations", color: "#fb923c" },
  { key: "planets"       as RadarFilterKey, label: "Planets",        color: "#fbbf24" },
  { key: "starlink"      as RadarFilterKey, label: "Starlink",       color: "#00e5ff" },
  { key: "gps"           as RadarFilterKey, label: "GPS",            color: "#34d399" },
  { key: "communication" as RadarFilterKey, label: "Other",          color: "#9ca3af" },
] as const;

export function CategoryMenu() {
  const filters        = useRadarFilterStore((s) => s.filters);
  const toggleRadar    = useRadarFilterStore((s) => s.toggleFilter);
  const setGlobeFilter = useSatelliteStore((s) => s.setFilter);

  const handleToggle = useCallback((key: RadarFilterKey) => {
    toggleRadar(key);
    const gk = GLOBE_KEY_MAP[key];
    if (gk) setGlobeFilter(gk, !filters[key]);
  }, [toggleRadar, setGlobeFilter, filters]);

  return (
    // Outer wrapper provides the fade-edge scroll hint so users know there
    // is more content on narrow screens.
    <div className="relative max-w-[calc(100vw-2rem)]">
      {/* Right-edge fade — visible when content overflows */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-full"
        style={{ background: "linear-gradient(to right, transparent, rgba(13,14,16,0.85))" }}
        aria-hidden="true"
      />

      <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(13,14,16,0.85)] px-3 py-2 backdrop-blur-xl sm:gap-3 sm:px-5 sm:py-2.5">
        {MAIN_CATEGORIES.map((cat) => {
          const enabled = !!filters[cat.key];
          return (
            <button
              key={cat.key}
              onClick={() => handleToggle(cat.key)}
              aria-pressed={enabled}
              aria-label={`${enabled ? "Hide" : "Show"} ${cat.label}`}
              className={cn(
                // 44px min-height touch target; flex to centre the content
                "flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition-all active:scale-95 sm:gap-2",
                enabled
                  ? "bg-[rgba(255,255,255,0.06)]"
                  : "opacity-40 hover:opacity-60"
              )}
            >
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  backgroundColor: cat.color,
                  boxShadow: enabled ? `0 0 6px 1px ${cat.color}99` : "none",
                }}
              />
              <span className="whitespace-nowrap text-[10px] font-medium text-[#A8A9AD] sm:text-xs">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
