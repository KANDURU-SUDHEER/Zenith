"use client";

import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  useRadarFilterStore,
  RADAR_FILTER_LIST,
  type RadarFilterKey,
} from "@/stores/radar-filter-store";
import { useSatelliteStore } from "@/stores/satellite-store";

// ─── Icon map ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<RadarFilterKey, string> = {
  sun:              "☀",
  naturalSatellites:"🌙",
  planets:          "🪐",
  iss:              "🛰",
  starlink:         "✦",
  gps:              "◎",
  weather:          "☁",
  communication:    "📡",
  earthObservation: "🌍",
  scientific:       "⬡",
  spaceStations:    "🔗",
  military:         "⬟",
};

// Globe key mapping
const GLOBE_KEY_MAP: Record<string, string> = {
  iss:              "iss",
  starlink:         "starlink",
  gps:              "gps",
  weather:          "weather",
  communication:    "communication",
  earthObservation: "earthObservation",
  scientific:       "scientific",
  spaceStations:    "spaceStations",
  military:         "military",
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] border transition-colors",
        checked
          ? "border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.12)]"
          : "border-[rgba(255,255,255,0.18)] bg-transparent"
      )}
    >
      {checked && (
        <svg
          viewBox="0 0 10 8"
          fill="none"
          className="h-[9px] w-[9px]"
          aria-hidden="true"
        >
          <path
            d="M1 4l2.5 2.5L9 1"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SatelliteSidebar() {
  const {
    filters,
    visibleCounts,
    toggleFilter: toggleRadarFilter,
    setAllFilters: setAllRadarFilters,
  } = useRadarFilterStore();
  const { setFilter: setGlobeFilter, setAllFilters: setAllGlobeFilters } =
    useSatelliteStore();

  // Read stable counts from the satellite store (set once on TLE load, not every 4s).
  // This avoids subscribing to the full satellite array which changes every 4s.
  const storeCounts = useSatelliteStore((s) => s.categoryCounts);

  // Compute per-category counts from store data (already keyed by filter key)
  const liveCounts = useMemo(() => {
    // computeCounts in use-orbital-engine already maps raw categories to filter
    // keys ("spaceStations", "scientific", "earthObservation", etc.), so we can
    // use storeCounts directly without re-mapping.
    return storeCounts;
  }, [storeCounts]);

  const displayCounts = useMemo(() => {
    const hasRadarCounts = Object.values(visibleCounts).some((v) => v > 0);
    return hasRadarCounts ? visibleCounts : liveCounts;
  }, [visibleCounts, liveCounts]);

  const allEnabled = useMemo(
    () => RADAR_FILTER_LIST.every((f) => filters[f.key]),
    [filters]
  );

  // Total across all enabled categories
  const totalCount = useMemo(
    () =>
      RADAR_FILTER_LIST.reduce(
        (sum, f) => sum + (displayCounts[f.key] ?? 0),
        0
      ),
    [displayCounts]
  );

  const handleToggle = useCallback(
    (key: string) => {
      toggleRadarFilter(key as RadarFilterKey);
      const globeKey = GLOBE_KEY_MAP[key];
      if (globeKey) setGlobeFilter(globeKey, !filters[key]);
    },
    [toggleRadarFilter, setGlobeFilter, filters]
  );

  const handleToggleAll = useCallback(() => {
    const next = !allEnabled;
    setAllRadarFilters(next);
    setAllGlobeFilters(next);
  }, [allEnabled, setAllRadarFilters, setAllGlobeFilters]);

  return (
    <div className="flex flex-col">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#75777D]">
          Filters
        </span>

        {/* count badge */}
        <span className="rounded-sm bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-[#75777D]">
          {totalCount}/{totalCount}
        </span>

        {/* spacer */}
        <span className="flex-1" />

        {/* Clear / All */}
        <button
          onClick={handleToggleAll}
          className="text-[11px] font-medium text-[#75777D] transition-colors hover:text-[#FAFAF8]"
        >
          {allEnabled ? "Clear" : "All"}
        </button>
      </div>

      {/* ── Rows ─────────────────────────────────────────────────── */}
      <div role="group" aria-label="Satellite category filters">
        {RADAR_FILTER_LIST.map((f) => {
          const enabled = !!filters[f.key];
          const count   = displayCounts[f.key] ?? 0;
          const icon    = CATEGORY_ICONS[f.key];

          return (
            <button
              key={f.key}
              onClick={() => handleToggle(f.key)}
              role="checkbox"
              aria-checked={enabled}
              aria-label={`${f.label}: ${count}`}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-1.5 py-[7px] transition-colors",
                "hover:bg-[rgba(255,255,255,0.035)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
              )}
            >
              {/* Category icon */}
              <span
                className={cn(
                  "w-[18px] shrink-0 text-center text-sm leading-none transition-opacity",
                  enabled ? "opacity-100" : "opacity-35"
                )}
              >
                {icon}
              </span>

              {/* Label */}
              <span
                className={cn(
                  "flex-1 text-left text-[13px] leading-none transition-colors",
                  enabled ? "font-medium text-[#DADBE0]" : "font-normal text-[#55575E]"
                )}
              >
                {f.label}
              </span>

              {/* Count */}
              <span
                className={cn(
                  "min-w-[2ch] text-right font-mono text-[12px] tabular-nums transition-colors",
                  enabled ? "text-[#75777D]" : "text-[#3A3B40]"
                )}
              >
                {count}
              </span>

              {/* Checkbox — plain, no colour */}
              <Checkbox checked={enabled} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
