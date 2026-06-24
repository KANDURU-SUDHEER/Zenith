/**
 * TLE Data Service
 *
 * Single fetch strategy: calls /api/satellites/tle?all=1 which returns all
 * groups in one serverless invocation (avoids Netlify per-function timeouts).
 * Falls back to direct CelesTrak per-group requests if the bulk endpoint fails.
 * Implements in-memory caching with graceful degradation to embedded fallback data.
 */

import type { TLEData, SatelliteCategory, CategoryMeta } from "@/types";
import { parseTLEText } from "./orbital-propagation";
import { getFallbackTLEData, getFallbackISSTLE } from "./tle-fallback";

// ─── Category Definitions ────────────────────────────────────────────────────

export const SATELLITE_CATEGORIES: CategoryMeta[] = [
  { id: "iss",              label: "ISS",              color: "#fbbf24", icon: "radio",      tleGroup: "stations" },
  { id: "starlink",         label: "Starlink",         color: "#00e5ff", icon: "wifi",       tleGroup: "starlink" },
  { id: "gps",              label: "GPS",              color: "#34d399", icon: "navigation", tleGroup: "gps-ops" },
  { id: "weather",          label: "Weather",          color: "#60a5fa", icon: "cloud",      tleGroup: "weather" },
  { id: "communication",    label: "Communication",    color: "#f472b6", icon: "satellite",  tleGroup: "geo" },
  { id: "earth-observation",label: "Earth Observation",color: "#a78bfa", icon: "eye",        tleGroup: "resource" },
  { id: "scientific",       label: "Scientific",       color: "#2dd4bf", icon: "telescope",  tleGroup: "science" },
  { id: "space-stations",   label: "Space Stations",   color: "#fb923c", icon: "building",   tleGroup: "stations" },
  { id: "military",         label: "Military",         color: "#ef4444", icon: "shield",     tleGroup: "military" },
  { id: "debris",           label: "Debris",           color: "#6b7280", icon: "circle-dot", tleGroup: "debris" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php";
const CELESTRAK_STARLINK_URL =
  "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle";

const TLE_CACHE_DURATION = 180_000; // 3 minutes

// Groups fetched via the ?all=1 bulk endpoint
const FETCH_GROUPS: Array<{ group: string; category: SatelliteCategory }> = [
  { group: "stations", category: "space-stations" },
  { group: "gps-ops",  category: "gps" },
  { group: "weather",  category: "weather" },
  { group: "geo",      category: "communication" },
  { group: "resource", category: "earth-observation" },
  { group: "science",  category: "scientific" },
  { group: "starlink", category: "starlink" },
  { group: "military", category: "military" },
];

// ─── Cache ───────────────────────────────────────────────────────────────────

interface TLECache { data: TLEData[]; timestamp: number; }
const groupCache = new Map<string, TLECache>();

// Last successful full fetch — used as fallback if next fetch fails
let lastGoodData: TLEData[] = [];

// ─── Bulk fetch (primary path) ───────────────────────────────────────────────

/**
 * Fetch all groups in one call to /api/satellites/tle?all=1.
 * The server returns newline-delimited JSON (NDJSON), one object per group.
 */
async function fetchAllViaProxy(): Promise<TLEData[]> {
  const resp = await fetch("/api/satellites/tle?all=1", {
    signal: AbortSignal.timeout(25_000),
  });

  if (!resp.ok) throw new Error(`Proxy all-groups returned ${resp.status}`);

  const text = await resp.text();
  const allTLE: TLEData[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const { group, category, tle } = JSON.parse(trimmed) as {
        group: string;
        category: SatelliteCategory;
        tle: string;
      };
      if (!tle || tle.length < 50) continue;
      const parsed = parseTLEText(tle, category);
      if (parsed.length > 0) {
        groupCache.set(group, { data: parsed, timestamp: Date.now() });
        allTLE.push(...parsed);
      }
    } catch {
      // Malformed line — skip
    }
  }

  return allTLE;
}

// ─── Per-group fallback ───────────────────────────────────────────────────────

/**
 * Direct per-group fetch from CelesTrak — used when the proxy bulk call fails.
 */
async function fetchGroupDirect(
  group: string,
  category: SatelliteCategory
): Promise<TLEData[]> {
  const cached = groupCache.get(group);
  if (cached && Date.now() - cached.timestamp < TLE_CACHE_DURATION) {
    return cached.data;
  }

  const url =
    group === "starlink"
      ? CELESTRAK_STARLINK_URL
      : `${CELESTRAK_BASE}?GROUP=${group}&FORMAT=tle`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/plain" },
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const text = await resp.text();
    if (!text || text.length < 50) throw new Error("Empty response");
    const parsed = parseTLEText(text, category);
    if (parsed.length === 0) throw new Error("No TLEs parsed");
    groupCache.set(group, { data: parsed, timestamp: Date.now() });
    return parsed;
  } catch (err) {
    console.warn(`[TLE] Direct fetch failed for ${group}:`, err);
    return cached?.data ?? [];
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch all satellite TLE data.
 * Primary: single bulk proxy call (?all=1).
 * Fallback 1: per-group direct CelesTrak calls.
 * Fallback 2: last successful fetch.
 * Fallback 3: embedded static TLE data.
 */
export async function fetchAllTLEData(): Promise<TLEData[]> {
  // ── Try bulk proxy ────────────────────────────────────────────────────────
  try {
    const bulk = await fetchAllViaProxy();
    if (bulk.length > 0) {
      const final = applyStarlinkCap(deduplicate(bulk));
      lastGoodData = final;
      return final;
    }
  } catch (err) {
    console.warn("[TLE] Bulk proxy failed, falling back to per-group direct fetch:", err);
  }

  // ── Try per-group direct ──────────────────────────────────────────────────
  try {
    const results = await Promise.allSettled(
      FETCH_GROUPS.map((g) => fetchGroupDirect(g.group, g.category))
    );
    const all: TLEData[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }
    if (all.length > 0) {
      const final = applyStarlinkCap(deduplicate(all));
      lastGoodData = final;
      return final;
    }
  } catch (err) {
    console.warn("[TLE] Per-group direct fetch failed:", err);
  }

  // ── Use last good data ────────────────────────────────────────────────────
  if (lastGoodData.length > 0) {
    console.warn("[TLE] Using last successful fetch as fallback");
    return lastGoodData;
  }

  // ── Embedded fallback ─────────────────────────────────────────────────────
  console.warn("[TLE] Using embedded static fallback data");
  return getFallbackTLEData();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deduplicate(tles: TLEData[]): TLEData[] {
  const seen = new Map<number, TLEData>();
  for (const tle of tles) {
    if (!seen.has(tle.noradId)) seen.set(tle.noradId, tle);
  }
  return Array.from(seen.values());
}

function applyStarlinkCap(tles: TLEData[]): TLEData[] {
  const starlink = tles
    .filter((t) => t.category === "starlink")
    .sort((a, b) => a.noradId - b.noradId)
    .slice(0, 500);
  const others = tles.filter((t) => t.category !== "starlink");
  return [...others, ...starlink];
}

// ─── ISS-specific fetch ───────────────────────────────────────────────────────

export async function fetchISSTLE(): Promise<TLEData | null> {
  const cached = groupCache.get("stations");
  const stations = cached?.data ?? await fetchGroupDirect("stations", "space-stations");
  const iss = stations.find((t) => t.name.includes("ISS") || t.noradId === 25544);
  return iss ?? getFallbackISSTLE();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getCategoryMeta(category: SatelliteCategory): CategoryMeta {
  return (
    SATELLITE_CATEGORIES.find((c) => c.id === category) ?? {
      id: "other" as SatelliteCategory,
      label: "Other",
      color: "#9ca3af",
      icon: "circle",
      tleGroup: "other",
    }
  );
}

export function clearTLECache(): void {
  groupCache.clear();
}

export function getAllCachedTLE(): TLEData[] {
  const all: TLEData[] = [];
  for (const [, cache] of groupCache) all.push(...cache.data);
  return all;
}
