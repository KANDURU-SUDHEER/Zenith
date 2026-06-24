"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useRadarFilterStore, RADAR_FILTER_LIST } from "@/stores/radar-filter-store";

export function CategoryMenu() {
  const { filters } = useRadarFilterStore();

  // Colors sourced directly from SATELLITE_CATEGORIES in tle-service.ts
  // so the dots always match what's rendered on the globe.
  const mainCategories = useMemo(() => [
    { key: "spaceStations", label: "Space Stations", color: "#fb923c" }, // space-stations
    { key: "planets",       label: "Planets",        color: "#fbbf24" }, // warm yellow (sun/planets)
    { key: "starlink",      label: "Starlink",       color: "#00e5ff" }, // starlink cyan
    { key: "gps",           label: "GPS",            color: "#34d399" }, // gps green
    { key: "communication", label: "Other",          color: "#9ca3af" }, // fallback gray
  ], []);

  return (
    <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[rgba(13,14,16,0.85)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] max-w-[calc(100vw-2rem)] overflow-x-auto">
      {mainCategories.map((cat) => {
        const filterItem = RADAR_FILTER_LIST.find(f => f.key === cat.key);
        const enabled = filterItem ? filters[filterItem.key] : false;

        return (
          <div
            key={cat.key}
            className={cn(
              "flex shrink-0 items-center gap-1.5 sm:gap-2 transition-opacity",
              enabled ? "opacity-100" : "opacity-40"
            )}
          >
            <div 
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: cat.color,
                boxShadow: `0 0 6px 1px ${cat.color}99`,
              }}
            />
            <span className="text-[10px] font-medium text-[#A8A9AD] sm:text-xs whitespace-nowrap">
              {cat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
