/**
 * TLE Data Service
 * Fetches Two-Line Element data via the server-side proxy at /api/satellites/tle.
 * Falls back to direct CelesTrak requests if the proxy is unavailable.
 * Implements caching with graceful degradation.
 */

import type { TLEData, SatelliteCategory, CategoryMeta } from "@/types";
import { parseTLEText } from "./orbital-propagation";
import { getFallbackTLEData, getFallbackISSTLE } from "./tle-fallback";

// ─── Category Definitions ────────────────────────────────────────────────────

export const SATELLITE_CATEGORIES: CategoryMeta[] = [
  {
    id: "iss",
    label: "ISS",
    color: "#fbbf24",
    icon: "radio",
    tleGroup: "stations",
  },
  {
    id: "starlink",
    label: "Starlink",
    color: "#00e5ff",
    icon: "wifi",
    tleGroup: "starlink",
  },
  {
    id: "gps",
    label: "GPS",
    color: "#34d399",
    icon: "navigation",
    tleGroup: "gps-ops",
  },
  {
    id: "weather",
    label: "Weather",
    color: "#60a5fa",
    icon: "cloud",
    tleGroup: "weather",
  },
  {
    id: "communication",
    label: "Communication",
    color: "#f472b6",
    icon: "satellite",
    tleGroup: "geo",
  },
  {
    id: "earth-observation",
    label: "Earth Observation",
    color: "#a78bfa",
    icon: "eye",
    tleGroup: "resource",
  },
  {
    id: "scientific",
    label: "Scientific",
    color: "#2dd4bf",
    icon: "telescope",
    tleGroup: "science",
  },
  {
    id: "space-stations",
    label: "Space Stations",
    color: "#fb923c",
    icon: "building",
    tleGroup: "stations",
  },
  {
    id: "military",
    label: "Military",
    color: "#ef4444",
    icon: "shield",
    tleGroup: "military",
  },
  {
    id: "debris",
    label: "Debris",
    color: "#6b7280",
    icon: "circle-dot",
    tleGroup: "1982-092",
  },
];

// ─── Fetch URLs ──────────────────────────────────────────────────────────────

const CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php";

/**
 * Supplemental Starlink URL — avoids 402 rate-limit on the main GP endpoint.
 */
const CELESTRAK_STARLINK_URL = "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle";

// ─── TLE Cache ───────────────────────────────────────────────────────────────

interface TLECache {
  data: TLEData[];
  timestamp: number;
}

const tleCache = new Map<string, TLECache>();
const TLE_CACHE_DURATION = 180_000; // 3 minutes
// Hard cap: there are at most ~10 distinct groups; this prevents runaway
// growth if group names change between refreshes.
const MAX_TLE_CACHE_ENTRIES = 20;

function setTLECache(group: string, entry: TLECache): void {
  if (tleCache.size >= MAX_TLE_CACHE_ENTRIES && !tleCache.has(group)) {
    // Evict oldest entry
    const firstKey = tleCache.keys().next().value;
    if (firstKey !== undefined) tleCache.delete(firstKey);
  }
  tleCache.set(group, entry);
}

// ─── Fetch Functions ─────────────────────────────────────────────────────────

/**
 * Fetch TLE data for a specific group.
 * Strategy: proxy → direct CelesTrak → cached → empty
 */
async function fetchTLEGroup(
  group: string,
  category: SatelliteCategory
): Promise<TLEData[]> {
  // Check cache first
  const cached = tleCache.get(group);
  if (cached && Date.now() - cached.timestamp < TLE_CACHE_DURATION) {
    return cached.data;
  }

  let text = "";

  // Attempt 1: Server-side proxy (avoids CORS)
  try {
    const proxyUrl = `/api/satellites/tle?group=${group}`;
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(25000), // Increased to 25 seconds
    });
    if (response.ok) {
      text = await response.text();
    } else {
      throw new Error(`Proxy ${response.status}`);
    }
  } catch {
    // Attempt 2: Direct CelesTrak (use supplemental for Starlink)
    try {
      const directUrl = group === "starlink"
        ? CELESTRAK_STARLINK_URL
        : `${CELESTRAK_BASE}?GROUP=${group}&FORMAT=tle`;
      const response = await fetch(directUrl, {
        signal: AbortSignal.timeout(30000), // Increased to 30 seconds
        headers: { Accept: "text/plain" },
      });
      if (response.ok) {
        text = await response.text();
      } else {
        throw new Error(`CelesTrak direct ${response.status}`);
      }
    } catch (err) {
      // Return stale cache if available
      if (cached) {
        return cached.data;
      }
      // Only log genuine fetch failures at error level
      console.error(`[TLE] Failed to fetch ${group}:`, err);
      return [];
    }
  }

  if (!text || text.length < 50) {
    if (cached) return cached.data;
    return [];
  }

  const tleData = parseTLEText(text, category);

  if (tleData.length === 0) {
    if (cached) return cached.data;
    return [];
  }

  // Cache the result
  setTLECache(group, {
    data: tleData,
    timestamp: Date.now(),
  });

  return tleData;
}

/**
 * Fetch all satellite TLE data across categories.
 * Limits Starlink to prevent performance issues.
 * Retains previous successful data if a group fails.
 */
// Persisted fallback data — bounded to the fixed set of fetch groups (≤10 entries).
const persistedGroupData = new Map<string, TLEData[]>();

export async function fetchAllTLEData(): Promise<TLEData[]> {
  const groups: Array<{ group: string; category: SatelliteCategory }> = [
    // "stations" from CelesTrak returns only actual crewed/inhabited space stations
    // (ISS, Tiangong, etc.) — a small set (~5 objects). Do NOT use it as a general
    // satellite catalog. The ISS is also tracked separately by useISSTracker.
    { group: "stations", category: "space-stations" },
    { group: "gps-ops",  category: "gps" },
    { group: "weather",  category: "weather" },
    { group: "geo",      category: "communication" },
    { group: "resource", category: "earth-observation" },
    { group: "science",  category: "scientific" },
    { group: "starlink", category: "starlink" },
    { group: "military", category: "military" },
  ];

  const results = await Promise.allSettled(
    groups.map((g) => fetchTLEGroup(g.group, g.category))
  );

  const allTLE: TLEData[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const groupName = groups[i]!.group;

    if (result.status === "fulfilled" && result.value.length > 0) {
      // Store successful result
      persistedGroupData.set(groupName, result.value);
      allTLE.push(...result.value);
    } else {
      // Use previously persisted data if this fetch failed
      const persisted = persistedGroupData.get(groupName);
      if (persisted && persisted.length > 0) {
        allTLE.push(...persisted);
      } else if (result.status === "rejected") {
        console.error(`[TLE] Group ${groupName} failed with no fallback:`, result.reason);
      }
    }
  }

  // Deduplicate by NORAD ID first — same satellite can appear in multiple groups
  // (e.g. ISS is in "stations" and also fetched by useISSTracker separately).
  // Dedup BEFORE applying the Starlink cap so the cap is deterministic.
  const deduped = new Map<number, TLEData>();
  for (const tle of allTLE) {
    if (!deduped.has(tle.noradId)) {
      deduped.set(tle.noradId, tle);
    }
  }

  // Apply Starlink cap on the deduplicated set — keeps only the first 200
  // Starlink entries (sorted by NORAD ID which is stable across refreshes).
  const uniqueAll = Array.from(deduped.values());
  const starlinkAll = uniqueAll
    .filter((t) => t.category === "starlink")
    .sort((a, b) => a.noradId - b.noradId)
    .slice(0, 500);
  const others = uniqueAll.filter((t) => t.category !== "starlink");
  const uniqueFinal = [...others, ...starlinkAll];

  // If no data was fetched at all, use embedded fallback
  if (uniqueFinal.length === 0) {
    const fallback = getFallbackTLEData();
    return fallback;
  }

  return uniqueFinal;
}

/**
 * Fetch only ISS TLE data.
 */
export async function fetchISSTLE(): Promise<TLEData | null> {
  const stations = await fetchTLEGroup("stations", "space-stations");
  const iss = stations.find(
    (t) => t.name.includes("ISS") || t.noradId === 25544
  );
  if (iss) return iss;

  // Fallback to embedded ISS TLE
  return getFallbackISSTLE();
}

/**
 * Get category metadata by ID.
 */
export function getCategoryMeta(category: SatelliteCategory): CategoryMeta {
  return (
    SATELLITE_CATEGORIES.find((c) => c.id === category) || {
      id: "other" as SatelliteCategory,
      label: "Other",
      color: "#9ca3af",
      icon: "circle",
      tleGroup: "other",
    }
  );
}

/**
 * Clear all TLE caches (for force refresh).
 */
export function clearTLECache(): void {
  tleCache.clear();
}

/**
 * Get all currently cached TLE data (for orbit rendering).
 */
export function getAllCachedTLE(): TLEData[] {
  const all: TLEData[] = [];
  for (const [, cache] of tleCache) {
    all.push(...cache.data);
  }
  return all;
}
