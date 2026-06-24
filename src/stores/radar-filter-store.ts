"use client";

import { create } from "zustand";

// ─── Filter Categories ───────────────────────────────────────────────────────

export type RadarFilterKey =
  | "sun"
  | "naturalSatellites" // Moon + planetary moons
  | "planets"
  | "iss"
  | "starlink"
  | "gps"
  | "weather"
  | "communication"
  | "earthObservation"
  | "scientific"
  | "spaceStations"
  | "military";

export interface RadarFilters {
  sun: boolean;
  naturalSatellites: boolean;
  planets: boolean;
  iss: boolean;
  starlink: boolean;
  gps: boolean;
  weather: boolean;
  communication: boolean;
  earthObservation: boolean;
  scientific: boolean;
  spaceStations: boolean;
  military: boolean;
  [key: string]: boolean;
}

export interface RadarFilterMeta {
  key: RadarFilterKey;
  label: string;
  color: string;
}

export const RADAR_FILTER_LIST: RadarFilterMeta[] = [
  { key: "sun", label: "Sun", color: "#f59e0b" },
  { key: "naturalSatellites", label: "Natural Satellites", color: "#94a3b8" },
  { key: "planets", label: "Planets", color: "#60a5fa" },
  { key: "iss", label: "ISS", color: "#fbbf24" },
  { key: "starlink", label: "Starlink", color: "#00e5ff" },
  { key: "gps", label: "GPS", color: "#34d399" },
  { key: "weather", label: "Weather", color: "#60a5fa" },
  { key: "communication", label: "Communication", color: "#f472b6" },
  { key: "earthObservation", label: "Earth Observation", color: "#a78bfa" },
  { key: "scientific", label: "Scientific", color: "#2dd4bf" },
  { key: "spaceStations", label: "Space Stations", color: "#fb923c" },
  { key: "military", label: "Military", color: "#ef4444" },
];

// ─── Store ───────────────────────────────────────────────────────────────────

interface RadarFilterState {
  filters: RadarFilters;
  /** Visible count per category (objects above horizon) */
  visibleCounts: Record<string, number>;
  /** Total count per category */
  totalCounts: Record<string, number>;

  toggleFilter: (key: RadarFilterKey) => void;
  setFilter: (key: RadarFilterKey, enabled: boolean) => void;
  setAllFilters: (enabled: boolean) => void;
  setVisibleCounts: (counts: Record<string, number>) => void;
  setTotalCounts: (counts: Record<string, number>) => void;
}

const initialFilters: RadarFilters = {
  sun: true,
  naturalSatellites: true,
  planets: true,
  iss: true,
  starlink: true,
  gps: true,
  weather: true,
  communication: true,
  earthObservation: true,
  scientific: true,
  spaceStations: true,
  military: true,
};

export const useRadarFilterStore = create<RadarFilterState>((set, get) => ({
  filters: initialFilters,
  visibleCounts: {},
  totalCounts: {},

  toggleFilter: (key) => {
    const { filters } = get();
    set({ filters: { ...filters, [key]: !filters[key] } });
  },

  setFilter: (key, enabled) => {
    const { filters } = get();
    set({ filters: { ...filters, [key]: enabled } });
  },

  setAllFilters: (enabled) => {
    const newFilters: RadarFilters = {} as RadarFilters;
    for (const f of RADAR_FILTER_LIST) {
      newFilters[f.key] = enabled;
    }
    set({ filters: newFilters });
  },

  setVisibleCounts: (counts) => set({ visibleCounts: counts }),
  setTotalCounts: (counts) => set({ totalCounts: counts }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a CelestialObject type + satellite category to a RadarFilterKey.
 */
export function objectToFilterKey(type: string, satCategory?: string): RadarFilterKey {
  switch (type) {
    case "star": return "sun";
    case "moon": return "naturalSatellites";
    case "planet": return "planets";
    case "iss": return "iss";
    case "satellite": {
      // Map satellite subcategory to filter key
      switch (satCategory) {
        case "starlink": return "starlink";
        case "gps": return "gps";
        case "weather": return "weather";
        case "communication": return "communication";
        case "earth-observation": return "earthObservation";
        case "scientific": return "scientific";
        case "space-stations": return "spaceStations";
        case "military": return "military";
        default: return "communication";
      }
    }
    default: return "communication";
  }
}
