"use client";

import { create } from "zustand";
import type { Satellite, SatelliteCategory, SatelliteFilters } from "@/types";

// ─── Store Interface ─────────────────────────────────────────────────────────

interface SatelliteState {
  /** Currently selected satellite for detail view */
  selectedSatellite: Satellite | null;

  /** Category visibility filters */
  filters: SatelliteFilters;

  /** Search query */
  searchQuery: string;

  /** Live satellite counts per category */
  categoryCounts: Record<string, number>;

  /** Total loaded satellite count */
  totalCount: number;

  /** Whether the satellite engine is initialized */
  engineReady: boolean;

  /** Last data refresh timestamp */
  lastRefresh: number;

  // ─── Actions ─────────────────────────────────────────────────────────────

  setSelectedSatellite: (satellite: Satellite | null) => void;
  setFilter: (category: string, enabled: boolean) => void;
  toggleFilter: (category: string) => void;
  setAllFilters: (enabled: boolean) => void;
  setSearchQuery: (query: string) => void;
  setCategoryCounts: (counts: Record<string, number>) => void;
  setTotalCount: (count: number) => void;
  setEngineReady: (ready: boolean) => void;
  setLastRefresh: (timestamp: number) => void;
}

// ─── Initial Filters ─────────────────────────────────────────────────────────

const initialFilters: SatelliteFilters = {
  iss: true,
  starlink: true,
  gps: true,
  weather: true,
  communication: true,
  science: true,
  earthObservation: true,
  spaceStations: true,
  military: true,
  debris: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSatelliteStore = create<SatelliteState>((set, get) => ({
  selectedSatellite: null,
  filters: initialFilters,
  searchQuery: "",
  categoryCounts: {},
  totalCount: 0,
  engineReady: false,
  lastRefresh: 0,

  setSelectedSatellite: (satellite) => set({ selectedSatellite: satellite }),

  setFilter: (category, enabled) => {
    const { filters } = get();
    set({ filters: { ...filters, [category]: enabled } });
  },

  toggleFilter: (category) => {
    const { filters } = get();
    set({ filters: { ...filters, [category]: !filters[category] } });
  },

  setAllFilters: (enabled) => {
    set({
      filters: Object.keys(get().filters).reduce(
        (acc, key) => ({ ...acc, [key]: enabled }),
        {} as SatelliteFilters
      ),
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategoryCounts: (counts) => set({ categoryCounts: counts }),

  setTotalCount: (count) => set({ totalCount: count }),

  setEngineReady: (ready) => set({ engineReady: ready }),

  setLastRefresh: (timestamp) => set({ lastRefresh: timestamp }),
}));

// ─── Filter Helpers ──────────────────────────────────────────────────────────

/**
 * Map SatelliteCategory to filter key.
 */
export function categoryToFilterKey(category: SatelliteCategory): string {
  switch (category) {
    case "iss": return "iss";
    case "starlink": return "starlink";
    case "gps": return "gps";
    case "weather": return "weather";
    case "communication": return "communication";
    case "earth-observation": return "earthObservation";
    case "scientific": return "science";
    case "space-stations": return "spaceStations";
    case "military": return "military";
    case "debris": return "debris";
    default: return "communication";
  }
}

/**
 * Check if a satellite passes current filters.
 */
export function passesFilter(
  satellite: Satellite,
  filters: SatelliteFilters,
  searchQuery: string
): boolean {
  // Category filter
  const filterKey = categoryToFilterKey(satellite.category);
  if (!filters[filterKey]) return false;

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = satellite.name.toLowerCase().includes(query);
    const noradMatch = String(satellite.noradId).includes(query);
    const categoryMatch = satellite.category.toLowerCase().includes(query);
    if (!nameMatch && !noradMatch && !categoryMatch) return false;
  }

  return true;
}
