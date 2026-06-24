/**
 * Global Search Engine — Unified intelligent query detection and routing.
 *
 * Reuses existing services:
 * - geocoding.ts (city/coordinate search via Nominatim)
 * - constellations-data.ts (constellation matching)
 * - celestial-engine.ts (planet data)
 * - satellite-metadata.ts (satellite metadata)
 *
 * Adds:
 * - Automatic query type detection
 * - Planet/Moon/ISS matching
 * - Constellation matching
 * - Country matching
 * - Observatory matching
 * - Launch site matching
 * - Grouped result merging
 */

import { searchLocations, parseCoordinates, formatLocationName, type NominatimResult } from "@/lib/geocoding";
import { CONSTELLATIONS } from "@/services/constellations-data";
import type { SearchResult, SearchResultType } from "@/stores/search-store";
import type { Satellite } from "@/types";

// ─── Static Data: Planets ────────────────────────────────────────────────────

const PLANETS = [
  { name: "Mercury", type: "planet" as const },
  { name: "Venus", type: "planet" as const },
  { name: "Mars", type: "planet" as const },
  { name: "Jupiter", type: "planet" as const },
  { name: "Saturn", type: "planet" as const },
  { name: "Uranus", type: "planet" as const },
  { name: "Neptune", type: "planet" as const },
  { name: "Pluto", type: "planet" as const },
] as const;

const MOON_ALIASES = ["moon", "luna", "the moon", "earth's moon"];

const ISS_ALIASES = [
  "iss", "international space station", "space station", "zarya",
  "nauka", "unity", "destiny", "columbus",
];

// ─── Static Data: Countries (top countries for location search) ──────────────

const COUNTRIES: Array<{ name: string; latitude: number; longitude: number }> = [
  { name: "United States", latitude: 39.8283, longitude: -98.5795 },
  { name: "India", latitude: 20.5937, longitude: 78.9629 },
  { name: "China", latitude: 35.8617, longitude: 104.1954 },
  { name: "Japan", latitude: 36.2048, longitude: 138.2529 },
  { name: "Germany", latitude: 51.1657, longitude: 10.4515 },
  { name: "France", latitude: 46.2276, longitude: 2.2137 },
  { name: "United Kingdom", latitude: 55.3781, longitude: -3.4360 },
  { name: "Brazil", latitude: -14.2350, longitude: -51.9253 },
  { name: "Australia", latitude: -25.2744, longitude: 133.7751 },
  { name: "Canada", latitude: 56.1304, longitude: -106.3468 },
  { name: "Russia", latitude: 61.5240, longitude: 105.3188 },
  { name: "South Korea", latitude: 35.9078, longitude: 127.7669 },
  { name: "Italy", latitude: 41.8719, longitude: 12.5674 },
  { name: "Spain", latitude: 40.4637, longitude: -3.7492 },
  { name: "Mexico", latitude: 23.6345, longitude: -102.5528 },
  { name: "Indonesia", latitude: -0.7893, longitude: 113.9213 },
  { name: "Pakistan", latitude: 30.3753, longitude: 69.3451 },
  { name: "Nigeria", latitude: 9.0820, longitude: 8.6753 },
  { name: "South Africa", latitude: -30.5595, longitude: 22.9375 },
  { name: "Egypt", latitude: 26.8206, longitude: 30.8025 },
  { name: "Argentina", latitude: -38.4161, longitude: -63.6167 },
  { name: "Saudi Arabia", latitude: 23.8859, longitude: 45.0792 },
  { name: "Turkey", latitude: 38.9637, longitude: 35.2433 },
  { name: "Thailand", latitude: 15.8700, longitude: 100.9925 },
  { name: "Vietnam", latitude: 14.0583, longitude: 108.2772 },
  { name: "New Zealand", latitude: -40.9006, longitude: 174.8860 },
  { name: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { name: "Malaysia", latitude: 4.2105, longitude: 101.9758 },
  { name: "Israel", latitude: 31.0461, longitude: 34.8516 },
  { name: "Sweden", latitude: 60.1282, longitude: 18.6435 },
  { name: "Norway", latitude: 60.4720, longitude: 8.4689 },
  { name: "Netherlands", latitude: 52.1326, longitude: 5.2913 },
  { name: "Switzerland", latitude: 46.8182, longitude: 8.2275 },
  { name: "Portugal", latitude: 39.3999, longitude: -8.2245 },
  { name: "Poland", latitude: 51.9194, longitude: 19.1451 },
  { name: "Ukraine", latitude: 48.3794, longitude: 31.1656 },
  { name: "Iran", latitude: 32.4279, longitude: 53.6880 },
  { name: "Chile", latitude: -35.6751, longitude: -71.5430 },
  { name: "Colombia", latitude: 4.5709, longitude: -74.2973 },
  { name: "Kenya", latitude: -0.0236, longitude: 37.9062 },
];

// ─── Static Data: Observatories ──────────────────────────────────────────────

const OBSERVATORIES: Array<{ name: string; latitude: number; longitude: number; country: string }> = [
  { name: "Mauna Kea Observatory", latitude: 19.8206, longitude: -155.4681, country: "United States" },
  { name: "Paranal Observatory (VLT)", latitude: -24.6272, longitude: -70.4048, country: "Chile" },
  { name: "La Silla Observatory", latitude: -29.2563, longitude: -70.7380, country: "Chile" },
  { name: "Cerro Tololo Observatory", latitude: -30.1691, longitude: -70.8066, country: "Chile" },
  { name: "Arecibo Observatory", latitude: 18.3464, longitude: -66.7528, country: "Puerto Rico" },
  { name: "Green Bank Observatory", latitude: 38.4330, longitude: -79.8397, country: "United States" },
  { name: "Jodrell Bank Observatory", latitude: 53.2367, longitude: -2.3085, country: "United Kingdom" },
  { name: "Palomar Observatory", latitude: 33.3564, longitude: -116.8650, country: "United States" },
  { name: "European Southern Observatory (ESO)", latitude: -24.6253, longitude: -70.4033, country: "Chile" },
  { name: "ALMA Observatory", latitude: -23.0193, longitude: -67.7532, country: "Chile" },
  { name: "Keck Observatory", latitude: 19.8264, longitude: -155.4744, country: "United States" },
  { name: "Gemini North Observatory", latitude: 19.8238, longitude: -155.4690, country: "United States" },
  { name: "Gemini South Observatory", latitude: -30.2408, longitude: -70.7367, country: "Chile" },
  { name: "Mount Wilson Observatory", latitude: 34.2261, longitude: -118.0572, country: "United States" },
  { name: "Lick Observatory", latitude: 37.3414, longitude: -121.6429, country: "United States" },
  { name: "Indian Astronomical Observatory (Hanle)", latitude: 32.7794, longitude: 78.9644, country: "India" },
  { name: "Vainu Bappu Observatory", latitude: 12.5760, longitude: 78.8266, country: "India" },
  { name: "Beijing Astronomical Observatory", latitude: 40.3960, longitude: 116.8780, country: "China" },
  { name: "Subaru Telescope", latitude: 19.8255, longitude: -155.4761, country: "Japan" },
  { name: "South African Astronomical Observatory", latitude: -33.9347, longitude: 18.4776, country: "South Africa" },
];

// ─── Static Data: Launch Sites ───────────────────────────────────────────────

const LAUNCH_SITES: Array<{ name: string; latitude: number; longitude: number; country: string }> = [
  { name: "Kennedy Space Center (KSC)", latitude: 28.5721, longitude: -80.6480, country: "United States" },
  { name: "Cape Canaveral Space Force Station", latitude: 28.4889, longitude: -80.5778, country: "United States" },
  { name: "Vandenberg Space Force Base", latitude: 34.7420, longitude: -120.5724, country: "United States" },
  { name: "Baikonur Cosmodrome", latitude: 45.9650, longitude: 63.3050, country: "Kazakhstan" },
  { name: "Vostochny Cosmodrome", latitude: 51.8842, longitude: 128.3336, country: "Russia" },
  { name: "Plesetsk Cosmodrome", latitude: 62.9271, longitude: 40.5777, country: "Russia" },
  { name: "Guiana Space Centre (Kourou)", latitude: 5.2360, longitude: -52.7688, country: "French Guiana" },
  { name: "Satish Dhawan Space Centre (SHAR)", latitude: 13.7199, longitude: 80.2304, country: "India" },
  { name: "Jiuquan Satellite Launch Center", latitude: 40.9583, longitude: 100.2910, country: "China" },
  { name: "Xichang Satellite Launch Center", latitude: 28.2468, longitude: 102.0266, country: "China" },
  { name: "Wenchang Space Launch Site", latitude: 19.6145, longitude: 110.9510, country: "China" },
  { name: "Tanegashima Space Center", latitude: 30.3992, longitude: 130.9688, country: "Japan" },
  { name: "Wallops Flight Facility", latitude: 37.8402, longitude: -75.4778, country: "United States" },
  { name: "SpaceX Starbase (Boca Chica)", latitude: 25.9971, longitude: -97.1568, country: "United States" },
  { name: "Rocket Lab Launch Complex 1", latitude: -39.2615, longitude: 177.8647, country: "New Zealand" },
  { name: "San Marco Platform", latitude: -2.9381, longitude: 40.2131, country: "Kenya" },
  { name: "Palmachim Airbase", latitude: 31.8979, longitude: 34.6907, country: "Israel" },
  { name: "Semnan Space Center", latitude: 35.2349, longitude: 53.9210, country: "Iran" },
  { name: "Naro Space Center", latitude: 34.4315, longitude: 127.5357, country: "South Korea" },
];

// ─── Query Type Detection ────────────────────────────────────────────────────

export type DetectedQueryType =
  | "coordinate"
  | "planet"
  | "moon"
  | "iss"
  | "satellite"
  | "constellation"
  | "country"
  | "observatory"
  | "launch-site"
  | "city"
  | "unknown";

export function detectQueryType(query: string): DetectedQueryType[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const types: DetectedQueryType[] = [];

  // Coordinate check (highest priority)
  if (parseCoordinates(query)) {
    types.push("coordinate");
    return types; // Coordinates are unambiguous
  }

  // ISS check
  if (ISS_ALIASES.some((alias) => q === alias || q.includes(alias))) {
    types.push("iss");
  }

  // Moon check
  if (MOON_ALIASES.some((alias) => q === alias)) {
    types.push("moon");
  }

  // Planet check
  if (PLANETS.some((p) => p.name.toLowerCase() === q || p.name.toLowerCase().startsWith(q))) {
    types.push("planet");
  }

  // Constellation check
  if (CONSTELLATIONS.some((c) =>
    c.name.toLowerCase().startsWith(q) ||
    c.abbreviation.toLowerCase() === q
  )) {
    types.push("constellation");
  }

  // Country check
  if (COUNTRIES.some((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q))) {
    types.push("country");
  }

  // Observatory check
  if (OBSERVATORIES.some((o) => o.name.toLowerCase().includes(q))) {
    types.push("observatory");
  }

  // Launch site check
  if (LAUNCH_SITES.some((l) => l.name.toLowerCase().includes(q))) {
    types.push("launch-site");
  }

  // Always include city search for text queries (Nominatim will handle it)
  if (types.length === 0 || !types.includes("coordinate")) {
    types.push("city");
  }

  // Always include satellite search for non-coordinate queries
  if (!types.includes("coordinate")) {
    types.push("satellite");
  }

  return types;
}

// ─── Search Functions ────────────────────────────────────────────────────────

function searchPlanets(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  return PLANETS
    .filter((p) => p.name.toLowerCase().startsWith(q) || p.name.toLowerCase().includes(q))
    .map((p) => ({
      id: `planet-${p.name.toLowerCase()}`,
      name: p.name,
      type: "planet" as SearchResultType,
      subtitle: "Planet • Solar System",
      icon: "🪐",
    }));
}

function searchMoon(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (MOON_ALIASES.some((alias) => alias.includes(q) || q.includes(alias))) {
    return [{
      id: "moon-earth",
      name: "Moon",
      type: "moon" as SearchResultType,
      subtitle: "Natural Satellite • Earth",
      icon: "🌙",
    }];
  }
  return [];
}

function searchISS(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (ISS_ALIASES.some((alias) => alias.includes(q) || q.includes(alias))) {
    return [{
      id: "satellite-iss-25544",
      name: "International Space Station (ISS)",
      type: "satellite" as SearchResultType,
      subtitle: "Space Station • NORAD 25544",
      icon: "🛸",
      noradId: 25544,
      category: "iss",
      country: "International",
    }];
  }
  return [];
}

function searchConstellations(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  return CONSTELLATIONS
    .filter((c) =>
      c.name.toLowerCase().startsWith(q) ||
      c.name.toLowerCase().includes(q) ||
      c.abbreviation.toLowerCase() === q
    )
    .map((c) => ({
      id: `constellation-${c.abbreviation.toLowerCase()}`,
      name: c.name,
      type: "constellation" as SearchResultType,
      subtitle: `Constellation • ${c.abbreviation}`,
      icon: "⭐",
      meta: { abbreviation: c.abbreviation, ra: c.rightAscension, dec: c.declination },
    }));
}

function searchCountries(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  return COUNTRIES
    .filter((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((c) => ({
      id: `country-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: c.name,
      type: "country" as SearchResultType,
      subtitle: "Country",
      icon: "🌍",
      latitude: c.latitude,
      longitude: c.longitude,
      country: c.name,
    }));
}

function searchObservatories(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  return OBSERVATORIES
    .filter((o) => o.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((o) => ({
      id: `observatory-${o.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`,
      name: o.name,
      type: "observatory" as SearchResultType,
      subtitle: `Observatory • ${o.country}`,
      icon: "🔭",
      latitude: o.latitude,
      longitude: o.longitude,
      country: o.country,
    }));
}

function searchLaunchSites(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  return LAUNCH_SITES
    .filter((l) => l.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map((l) => ({
      id: `launch-${l.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`,
      name: l.name,
      type: "launch-site" as SearchResultType,
      subtitle: `Launch Site • ${l.country}`,
      icon: "🚀",
      latitude: l.latitude,
      longitude: l.longitude,
      country: l.country,
    }));
}

function searchCoordinates(query: string): SearchResult[] {
  const coords = parseCoordinates(query);
  if (!coords) return [];
  return [{
    id: `coord-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`,
    name: `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`,
    type: "coordinate" as SearchResultType,
    subtitle: "Go to coordinates",
    icon: "📍",
    latitude: coords.latitude,
    longitude: coords.longitude,
  }];
}

export function searchSatellites(query: string, satellites: Satellite[]): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  const matches = satellites
    .filter((sat) => {
      const nameMatch = sat.name.toLowerCase().includes(q);
      const noradMatch = String(sat.noradId).includes(q);
      const categoryMatch = sat.category.toLowerCase().includes(q);
      const operatorMatch = sat.operator?.toLowerCase().includes(q) ?? false;
      return nameMatch || noradMatch || categoryMatch || operatorMatch;
    })
    .slice(0, 8);

  return matches.map((sat) => ({
    id: `satellite-${sat.noradId}`,
    name: sat.name,
    type: "satellite" as SearchResultType,
    subtitle: `Satellite • NORAD ${sat.noradId} • ${sat.category}`,
    icon: "🛰️",
    noradId: sat.noradId,
    category: sat.category,
    latitude: sat.latitude,
    longitude: sat.longitude,
  }));
}

async function searchCities(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  try {
    const results = await searchLocations({ query, limit: 6, signal });
    return results.map((r: NominatimResult) => ({
      id: `city-${r.place_id}`,
      name: formatLocationName(r),
      type: "city" as SearchResultType,
      subtitle: r.display_name,
      icon: "🏙️",
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      country: r.address?.country,
    }));
  } catch (err) {
    if ((err as Error).name === "AbortError") return [];
    throw err;
  }
}

// ─── Main Search Function ────────────────────────────────────────────────────

export interface SearchOptions {
  query: string;
  satellites: Satellite[];
  signal?: AbortSignal;
}

export async function executeSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { query, satellites, signal } = options;
  const q = query.trim();
  if (!q) return [];

  const types = detectQueryType(q);
  const allResults: SearchResult[] = [];

  // Synchronous searches (instant)
  if (types.includes("coordinate")) {
    allResults.push(...searchCoordinates(q));
  }
  if (types.includes("iss")) {
    allResults.push(...searchISS(q));
  }
  if (types.includes("moon")) {
    allResults.push(...searchMoon(q));
  }
  if (types.includes("planet")) {
    allResults.push(...searchPlanets(q));
  }
  if (types.includes("constellation")) {
    allResults.push(...searchConstellations(q));
  }
  if (types.includes("country")) {
    allResults.push(...searchCountries(q));
  }
  if (types.includes("observatory")) {
    allResults.push(...searchObservatories(q));
  }
  if (types.includes("launch-site")) {
    allResults.push(...searchLaunchSites(q));
  }
  if (types.includes("satellite")) {
    allResults.push(...searchSatellites(q, satellites));
  }

  // Async search (city via Nominatim)
  if (types.includes("city") && q.length >= 2) {
    try {
      const cityResults = await searchCities(q, signal);
      // Deduplicate with existing country results
      const existingNames = new Set(allResults.map((r) => r.name.toLowerCase()));
      const uniqueCities = cityResults.filter((c) => !existingNames.has(c.name.toLowerCase()));
      allResults.push(...uniqueCities);
    } catch {
      // City search failed, but we still have local results
    }
  }

  return allResults;
}

// ─── Group Results by Type ───────────────────────────────────────────────────

export interface SearchResultGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  city: "Cities",
  coordinate: "Coordinates",
  planet: "Planets",
  moon: "Celestial Objects",
  satellite: "Satellites",
  constellation: "Constellations",
  country: "Countries",
  observatory: "Observatories",
  "launch-site": "Launch Sites",
  recent: "Recent Searches",
  favorite: "Favorites",
};

export function groupResults(results: SearchResult[]): SearchResultGroup[] {
  const groups = new Map<SearchResultType, SearchResult[]>();

  for (const result of results) {
    const type = result.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(result);
  }

  // Order: coordinates, planets, moon, constellation, satellite, city, country, observatory, launch-site
  const order: SearchResultType[] = [
    "coordinate", "planet", "moon", "constellation", "satellite",
    "city", "country", "observatory", "launch-site", "recent", "favorite",
  ];

  return order
    .filter((type) => groups.has(type))
    .map((type) => ({
      type,
      label: TYPE_LABELS[type],
      results: groups.get(type)!,
    }));
}
