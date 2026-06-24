/**
 * Satellite Statistics Engine
 * 
 * Computes executive summary statistics, category/country/orbit breakdowns,
 * and altitude distribution from the live satellite data.
 */

import type { Satellite } from "@/types";
import type {
  SatelliteReportEntry,
  ReportStatistics,
  CategoryBreakdown,
  CountryBreakdown,
  OrbitTypeBreakdown,
  AltitudeDistribution,
  MissionReportConfig,
} from "./types";
import { getSatelliteMetadata } from "@/services/satellite-metadata";
import { computeLookAngles } from "@/services/visibility-engine";
import { SATELLITE_CATEGORIES } from "@/services/tle-service";

// ─── Category Colors ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {};
for (const cat of SATELLITE_CATEGORIES) {
  CATEGORY_COLORS[cat.id] = cat.color;
}

// ─── Filter & Prepare Satellite Entries ──────────────────────────────────────

export function prepareSatelliteEntries(
  satellites: Satellite[],
  config: MissionReportConfig
): SatelliteReportEntry[] {
  const observer = config.observer;
  const entries: SatelliteReportEntry[] = [];

  for (const sat of satellites) {
    // Category filter — always check individual category flags
    if (!config.categories.all) {
      const catKey = mapCategoryToFilterKey(sat.category);
      if (!config.categories[catKey as keyof typeof config.categories]) continue;
    }

    // Compute distance from observer
    const lookAngles = computeLookAngles(
      { latitude: observer.latitude, longitude: observer.longitude },
      { latitude: sat.latitude, longitude: sat.longitude, altitude: sat.altitude }
    );

    // Search radius filter
    const groundDistance = computeGroundDistance(
      observer.latitude,
      observer.longitude,
      sat.latitude,
      sat.longitude
    );
    if (config.searchRadius > 0 && groundDistance > config.searchRadius) continue;

    // Altitude filter
    if (config.altitudeFilter > 0 && sat.altitude > config.altitudeFilter) continue;

    const metadata = getSatelliteMetadata(sat.noradId, sat.name, sat.category);

    entries.push({
      noradId: sat.noradId,
      name: sat.name,
      country: metadata.country,
      operator: metadata.operator,
      launchYear: sat.launchYear,
      category: sat.category,
      orbitType: sat.orbitType || "unknown",
      latitude: sat.latitude,
      longitude: sat.longitude,
      altitude: sat.altitude,
      speedKms: sat.velocity,
      speedKmh: sat.velocity * 3600,
      inclination: sat.inclination,
      orbitPeriod: sat.period,
      visibility: lookAngles.elevation > 0 ? "Visible" : "Below Horizon",
      distanceFromObserver: lookAngles.range,
      status: "active",
    });
  }

  return entries;
}

// ─── Executive Summary Statistics ────────────────────────────────────────────

export function computeStatistics(
  entries: SatelliteReportEntry[],
  totalScanned: number
): ReportStatistics {
  if (entries.length === 0) {
    return {
      totalScanned,
      visibleSatellites: 0,
      filteredObjects: 0,
      countriesRepresented: 0,
      categoriesCount: 0,
      orbitTypesCount: 0,
      mostCommonOrbit: "N/A",
      highestSatellite: { name: "N/A", altitude: 0 },
      lowestSatellite: { name: "N/A", altitude: 0 },
      averageSpeed: 0,
      averageAltitude: 0,
      fastestObject: { name: "N/A", speed: 0 },
      nearestObject: { name: "N/A", distance: 0 },
      farthestObject: { name: "N/A", distance: 0 },
    };
  }

  const visible = entries.filter((e) => e.visibility === "Visible");
  const countries = new Set(entries.map((e) => e.country));
  const categoriesSet = new Set(entries.map((e) => e.category));

  // Orbit type frequency
  const orbitCounts: Record<string, number> = {};
  for (const e of entries) {
    orbitCounts[e.orbitType] = (orbitCounts[e.orbitType] || 0) + 1;
  }
  const orbitTypesSet = new Set(entries.map((e) => e.orbitType));
  const mostCommonOrbit = Object.entries(orbitCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

  // Extremes
  const sorted = [...entries].sort((a, b) => b.altitude - a.altitude);
  const fastest = [...entries].sort((a, b) => b.speedKms - a.speedKms);
  const nearest = [...entries].sort((a, b) => a.distanceFromObserver - b.distanceFromObserver);
  const farthest = [...entries].sort((a, b) => b.distanceFromObserver - a.distanceFromObserver);

  const avgSpeed = entries.reduce((sum, e) => sum + e.speedKms, 0) / entries.length;
  const avgAlt = entries.reduce((sum, e) => sum + e.altitude, 0) / entries.length;

  return {
    totalScanned,
    visibleSatellites: visible.length,
    filteredObjects: entries.length,
    countriesRepresented: countries.size,
    categoriesCount: categoriesSet.size,
    orbitTypesCount: orbitTypesSet.size,
    mostCommonOrbit: mostCommonOrbit.toUpperCase(),
    highestSatellite: { name: sorted[0]!.name, altitude: sorted[0]!.altitude },
    lowestSatellite: { name: sorted[sorted.length - 1]!.name, altitude: sorted[sorted.length - 1]!.altitude },
    averageSpeed: avgSpeed,
    averageAltitude: avgAlt,
    fastestObject: { name: fastest[0]!.name, speed: fastest[0]!.speedKms },
    nearestObject: { name: nearest[0]!.name, distance: nearest[0]!.distanceFromObserver },
    farthestObject: { name: farthest[0]!.name, distance: farthest[0]!.distanceFromObserver },
  };
}

// ─── Category Breakdown ──────────────────────────────────────────────────────

export function computeCategoryBreakdown(entries: SatelliteReportEntry[]): CategoryBreakdown[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.category] = (counts[e.category] || 0) + 1;
  }

  const total = entries.length || 1;
  return Object.entries(counts)
    .map(([category, count]) => ({
      category,
      count,
      color: CATEGORY_COLORS[category] || "#6b7280",
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Country Breakdown ───────────────────────────────────────────────────────

export function computeCountryBreakdown(entries: SatelliteReportEntry[]): CountryBreakdown[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.country] = (counts[e.country] || 0) + 1;
  }

  const total = entries.length || 1;
  return Object.entries(counts)
    .map(([country, count]) => ({
      country,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Orbit Type Breakdown ────────────────────────────────────────────────────

export function computeOrbitTypeBreakdown(entries: SatelliteReportEntry[]): OrbitTypeBreakdown[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.orbitType] = (counts[e.orbitType] || 0) + 1;
  }

  const total = entries.length || 1;
  return Object.entries(counts)
    .map(([type, count]) => ({
      type: type.toUpperCase(),
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Altitude Distribution ───────────────────────────────────────────────────

export function computeAltitudeDistribution(entries: SatelliteReportEntry[]): AltitudeDistribution[] {
  const ranges = [
    { label: "0 – 500 km (LEO)", min: 0, max: 500 },
    { label: "500 – 1000 km", min: 500, max: 1000 },
    { label: "1000 – 2000 km (MEO-Low)", min: 1000, max: 2000 },
    { label: "2000 – 20000 km (MEO)", min: 2000, max: 20000 },
    { label: "20000 – 36000 km (GEO)", min: 20000, max: 36000 },
    { label: "36000+ km (HEO)", min: 36000, max: Infinity },
  ];

  return ranges.map(({ label, min, max }) => ({
    range: label,
    count: entries.filter((e) => e.altitude >= min && e.altitude < max).length,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapCategoryToFilterKey(category: string): string {
  switch (category) {
    case "iss": return "iss";
    case "starlink": return "starlink";
    case "gps": return "gps";
    case "weather": return "weather";
    case "earth-observation": return "earthObservation";
    case "scientific": return "scientific";
    case "communication": return "communication";
    case "military": return "military";
    case "space-stations": return "spaceStations";
    case "debris": return "naturalSatellites"; // debris maps to naturalSatellites filter
    default: return "naturalSatellites"; // unknown categories use naturalSatellites as catch-all
  }
}

function computeGroundDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
