"use client";

import { API_ENDPOINTS } from "./constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    district?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface ReverseGeocodeResult {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  displayName: string;
  name: string;
}

export interface GeocodingSearchOptions {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const searchCache = new Map<string, { results: NominatimResult[]; timestamp: number }>();
const reverseCache = new Map<string, { result: ReverseGeocodeResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

function getReverseCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

// ─── Coordinate Detection ───────────────────────────────────────────────────

const COORDINATE_PATTERNS = [
  // "13.6288,79.4192" or "13.6288, 79.4192"
  /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
  // "13.6288° N, 79.4192° E"
  /^(-?\d+\.?\d*)°?\s*([NS])?\s*,?\s*(-?\d+\.?\d*)°?\s*([EW])?$/i,
];

export function parseCoordinates(input: string): { latitude: number; longitude: number } | null {
  const trimmed = input.trim();

  for (const pattern of COORDINATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      if (match[2] && match[4]) {
        // Pattern with N/S/E/W
        let lat = parseFloat(match[1] ?? "");
        let lng = parseFloat(match[3] ?? "");
        if (match[2].toUpperCase() === "S") lat = -lat;
        if (match[4].toUpperCase() === "W") lng = -lng;
        if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
      } else {
        // Simple comma-separated
        const lat = parseFloat(match[1] ?? "");
        const lng = parseFloat(match[2] ?? "");
        if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ─── Timezone Estimation ────────────────────────────────────────────────────

/**
 * Rough UTC offset estimation from longitude only.
 * Latitude does not affect timezone offset so the parameter is not needed.
 * A proper timezone lookup requires a geometry database (e.g. tzdb) which
 * is out of scope for a client-side utility.
 */
export function estimateTimezone(longitude: number): string {
  const offset = Math.round(longitude / 15);
  const sign = offset >= 0 ? "+" : "";
  return `UTC${sign}${offset}`;
}

// ─── Geocoding API ──────────────────────────────────────────────────────────

export async function searchLocations(options: GeocodingSearchOptions): Promise<NominatimResult[]> {
  const { query, limit = 8, signal } = options;
  const cacheKey = getCacheKey(query);

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  const url = `${API_ENDPOINTS.nominatim}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1&accept-language=en`;

  const response = await fetch(url, {
    headers: { "User-Agent": "ProjectZenith/1.0 (astronomy-app)" },
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    throw new Error(`Search failed (${response.status})`);
  }

  const data: NominatimResult[] = await response.json();

  // Deduplicate by coordinates (within ~100m)
  const unique = deduplicateResults(data);

  // Cache results
  searchCache.set(cacheKey, { results: unique, timestamp: Date.now() });

  return unique;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const cacheKey = getReverseCacheKey(latitude, longitude);

  // Check cache
  const cached = reverseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const url = `${API_ENDPOINTS.nominatim}/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1&accept-language=en`;

  const response = await fetch(url, {
    headers: { "User-Agent": "ProjectZenith/1.0 (astronomy-app)" },
    signal,
  });

  if (!response.ok) {
    // Fallback result
    return {
      displayName: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
      name: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
    };
  }

  const data = await response.json();
  const address = data.address ?? {};

  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  const district = address.county ?? address.district ?? address.suburb;
  const state = address.state;
  const country = address.country;
  const postalCode = address.postcode;
  const name: string = city ?? district ?? state ?? (data.display_name ? data.display_name.split(",")[0] : null) ?? `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;

  const result: ReverseGeocodeResult = {
    city,
    district,
    state,
    country,
    postalCode,
    displayName: (data.display_name as string) ?? name,
    name,
  };

  // Cache result
  reverseCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deduplicateResults(results: NominatimResult[]): NominatimResult[] {
  const seen = new Map<string, NominatimResult>();

  for (const r of results) {
    const key = `${parseFloat(r.lat).toFixed(3)},${parseFloat(r.lon).toFixed(3)}`;
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

export function formatLocationName(result: NominatimResult): string {
  const address = result.address;
  if (!address) return result.display_name.split(",")[0] ?? result.display_name;

  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  const state = address.state;
  const country = address.country;

  const parts: string[] = [];
  if (city) parts.push(city);
  if (state && state !== city) parts.push(state);
  if (country) parts.push(country);

  return parts.join(", ") || (result.display_name.split(",")[0] ?? result.display_name);
}
