/**
 * Orbital Propagation Engine
 * Uses satellite.js for SGP4/SDP4 propagation of TLE data.
 * This is the core computation layer for real-time satellite tracking.
 */

import * as satellite from "satellite.js";
import type {
  TLEData,
  PropagatedPosition,
  OrbitPoint,
  SatellitePass,
  SatelliteCategory,
  OrbitType,
} from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ─── Satrec Cache ────────────────────────────────────────────────────────────
// twoline2satrec is expensive string-parsing. Cache by NORAD ID.
// Cache is invalidated when TLE line1 changes (new orbital elements).
// Size is capped at MAX_CACHE_SIZE entries — oldest entries are evicted first
// to prevent unbounded growth across long sessions with rotating TLE data.

interface SatrecCacheEntry {
  satrec: ReturnType<typeof satellite.twoline2satrec>;
  line1: string;
}

const MAX_SATREC_CACHE = 1500;
const satrecCache = new Map<number, SatrecCacheEntry>();

function getCachedSatrec(tle: TLEData): ReturnType<typeof satellite.twoline2satrec> {
  const cached = satrecCache.get(tle.noradId);
  if (cached && cached.line1 === tle.line1) {
    return cached.satrec;
  }
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  // Evict oldest entry when cap is reached (Map preserves insertion order)
  if (satrecCache.size >= MAX_SATREC_CACHE) {
    const firstKey = satrecCache.keys().next().value;
    if (firstKey !== undefined) satrecCache.delete(firstKey);
  }

  satrecCache.set(tle.noradId, { satrec, line1: tle.line1 });
  return satrec;
}

// ─── TLE Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse raw TLE text into structured TLE data objects.
 */
export function parseTLEText(rawText: string, category: SatelliteCategory): TLEData[] {
  const lines = rawText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const tleList: TLEData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i]!.trim();
    const line1 = lines[i + 1]!.trim();
    const line2 = lines[i + 2]!.trim();

    // Validate TLE format
    if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) {
      // Try 2-line format (no name line)
      if (lines[i]!.startsWith("1 ") && lines[i + 1]!.startsWith("2 ")) {
        const noradId = parseInt(lines[i]!.substring(2, 7).trim(), 10);
        tleList.push({
          name: `SAT-${noradId}`,
          line1: lines[i]!,
          line2: lines[i + 1]!,
          noradId,
          category,
        });
        i -= 1; // Adjust for 2-line format
      }
      continue;
    }

    const noradId = parseInt(line1.substring(2, 7).trim(), 10);

    tleList.push({
      name,
      line1,
      line2,
      noradId,
      category,
    });
  }

  return tleList;
}

// ─── SGP4 Propagation ────────────────────────────────────────────────────────

/**
 * Propagate a satellite to a specific time using SGP4.
 * Returns null if propagation fails.
 */
export function propagateToTime(
  tle: TLEData,
  date: Date
): PropagatedPosition | null {
  try {
    const satrec = getCachedSatrec(tle);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      typeof positionAndVelocity.position === "boolean" ||
      !positionAndVelocity.position
    ) {
      return null;
    }

    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    const gmst = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);

    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);
    const altitude = positionGd.height; // km

    // Calculate velocity magnitude
    let velocity = 0;
    if (velocityEci && typeof velocityEci !== "boolean") {
      velocity = Math.sqrt(
        velocityEci.x ** 2 + velocityEci.y ** 2 + velocityEci.z ** 2
      );
    }

    return {
      latitude,
      longitude,
      altitude,
      velocity,
      timestamp: date.getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * Propagate a satellite across a time range to generate orbit path.
 */
export function propagateOrbitPath(
  tle: TLEData,
  startDate: Date,
  durationMinutes: number,
  stepSeconds: number = 60
): OrbitPoint[] {
  const points: OrbitPoint[] = [];
  const steps = Math.floor((durationMinutes * 60) / stepSeconds);

  for (let i = 0; i <= steps; i++) {
    const time = new Date(startDate.getTime() + i * stepSeconds * 1000);
    const pos = propagateToTime(tle, time);
    if (pos) {
      points.push({
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        timestamp: time.getTime(),
      });
    }
  }

  return points;
}

/**
 * Compute full orbit path (one complete orbit period).
 */
export function computeFullOrbit(
  tle: TLEData,
  date: Date
): OrbitPoint[] {
  const satrec = getCachedSatrec(tle);
  const meanMotion = satrec.no; // rad/min
  const periodMinutes = (2 * Math.PI) / meanMotion;

  // Generate path for one complete orbit
  return propagateOrbitPath(tle, date, periodMinutes, 30);
}

/**
 * Compute orbit trail (past positions).
 */
export function computeOrbitTrail(
  tle: TLEData,
  currentDate: Date,
  trailMinutes: number = 45
): OrbitPoint[] {
  const startDate = new Date(currentDate.getTime() - trailMinutes * 60 * 1000);
  return propagateOrbitPath(tle, startDate, trailMinutes, 20);
}

// ─── Pass Prediction ─────────────────────────────────────────────────────────

/**
 * Calculate satellite passes over an observer's location.
 * Returns the next visible pass.
 */
export function predictNextPass(
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  observerAlt: number = 0,
  maxDays: number = 5
): SatellitePass | null {
  try {
    const satrec = getCachedSatrec(tle);
    const observerGd = {
      longitude: observerLng * DEG_TO_RAD,
      latitude: observerLat * DEG_TO_RAD,
      height: observerAlt / 1000, // km
    };

    const now = new Date();
    const endTime = new Date(now.getTime() + maxDays * 86400000);
    const stepMs = 30000; // 30 second steps for scanning

    let inPass = false;
    let passStart: Date | null = null;
    let passStartAz = 0;
    let maxEl = 0;
    let maxElTime: Date | null = null;
    let maxElAz = 0;

    // Reuse a single Date object across the loop to avoid allocating
    // ~14,400 Date objects for a 5-day scan at 30-second steps.
    const scanDate = new Date();

    for (
      let t = now.getTime();
      t < endTime.getTime();
      t += stepMs
    ) {
      scanDate.setTime(t);
      const positionAndVelocity = satellite.propagate(satrec, scanDate);

      if (
        typeof positionAndVelocity.position === "boolean" ||
        !positionAndVelocity.position
      ) {
        continue;
      }

      const positionEci = positionAndVelocity.position;
      const gmst = satellite.gstime(scanDate);
      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

      const elevation = lookAngles.elevation * RAD_TO_DEG;
      const azimuth = lookAngles.azimuth * RAD_TO_DEG;

      if (elevation > 5) {
        // Above 5° elevation threshold
        if (!inPass) {
          inPass = true;
          passStart = new Date(t);
          passStartAz = azimuth;
          maxEl = elevation;
          maxElTime = new Date(t);
          maxElAz = azimuth;
        }

        if (elevation > maxEl) {
          maxEl = elevation;
          maxElTime = new Date(t);
          maxElAz = azimuth;
        }
      } else if (inPass && elevation <= 5) {
        // Pass ended
        if (passStart && maxElTime && maxEl > 10) {
          const duration = (t - passStart.getTime()) / 1000;
          return {
            startTime: passStart,
            startAzimuth: passStartAz,
            maxElevation: maxEl,
            maxElevationTime: maxElTime,
            maxAzimuth: maxElAz,
            endTime: new Date(t),
            endAzimuth: azimuth,
            duration,
          };
        }
        // Reset for next pass scan
        inPass = false;
        passStart = null;
        maxEl = 0;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Orbit Classification ────────────────────────────────────────────────────

/**
 * Classify orbit type based on orbital parameters.
 */
export function classifyOrbit(altitude: number, inclination: number): OrbitType {
  if (altitude < 2000) {
    if (Math.abs(inclination - 98) < 5) return "SSO";
    return "LEO";
  }
  if (altitude >= 2000 && altitude < 35000) return "MEO";
  if (altitude >= 35000 && altitude < 36500) return "GEO";
  if (altitude >= 36500) return "HEO";
  return "unknown";
}

/**
 * Determine satellite category from name and TLE group.
 */
export function categorizeSatellite(name: string, tleGroup: string): SatelliteCategory {
  const nameLower = name.toLowerCase();

  if (nameLower === "iss (zarya)" || nameLower.includes("iss")) return "iss";
  if (nameLower.includes("starlink")) return "starlink";
  if (
    nameLower.includes("gps") ||
    nameLower.includes("navstar") ||
    nameLower.includes("galileo") ||
    nameLower.includes("beidou") ||
    nameLower.includes("glonass")
  ) return "gps";
  if (
    nameLower.includes("noaa") ||
    nameLower.includes("goes") ||
    nameLower.includes("meteosat") ||
    nameLower.includes("himawari") ||
    nameLower.includes("meteor-m") ||
    tleGroup === "weather"
  ) return "weather";
  if (
    nameLower.includes("iridium") ||
    nameLower.includes("globalstar") ||
    nameLower.includes("orbcomm") ||
    nameLower.includes("ses") ||
    nameLower.includes("intelsat") ||
    nameLower.includes("telesat") ||
    tleGroup === "geo" ||
    tleGroup === "iridium"
  ) return "communication";
  if (
    nameLower.includes("landsat") ||
    nameLower.includes("sentinel") ||
    nameLower.includes("worldview") ||
    nameLower.includes("terra") ||
    nameLower.includes("aqua") ||
    tleGroup === "resource"
  ) return "earth-observation";
  if (
    nameLower.includes("hubble") ||
    nameLower.includes("chandra") ||
    nameLower.includes("jwst") ||
    nameLower.includes("fermi") ||
    tleGroup === "science"
  ) return "scientific";
  if (
    nameLower.includes("tiangong") ||
    nameLower.includes("css") ||
    tleGroup === "stations"
  ) return "space-stations";
  if (nameLower.includes("deb") || nameLower.includes("r/b")) return "debris";

  // Default based on TLE group
  switch (tleGroup) {
    case "stations": return "space-stations";
    case "starlink": return "starlink";
    case "gps-ops": return "gps";
    case "weather": return "weather";
    case "geo": return "communication";
    default: return "other";
  }
}

/**
 * Get orbital period in minutes from TLE.
 */
export function getOrbitalPeriod(tle: TLEData): number {
  try {
    const satrec = getCachedSatrec(tle);
    return (2 * Math.PI) / satrec.no; // minutes
  } catch {
    return 90; // Default LEO period
  }
}

/**
 * Get inclination from TLE in degrees.
 */
export function getInclination(tle: TLEData): number {
  try {
    const satrec = getCachedSatrec(tle);
    return satrec.inclo * RAD_TO_DEG;
  } catch {
    return 0;
  }
}

/**
 * Interpolate between two positions for smooth animation.
 */
export { type PropagatedPosition };

export function interpolatePosition(
  pos1: PropagatedPosition,
  pos2: PropagatedPosition,
  t: number // 0 to 1
): PropagatedPosition {
  // Handle longitude wrapping
  let lng1 = pos1.longitude;
  let lng2 = pos2.longitude;
  if (Math.abs(lng2 - lng1) > 180) {
    if (lng2 > lng1) lng1 += 360;
    else lng2 += 360;
  }

  const lng = lng1 + (lng2 - lng1) * t;
  const normalizedLng = ((lng + 180) % 360) - 180;

  return {
    latitude: pos1.latitude + (pos2.latitude - pos1.latitude) * t,
    longitude: normalizedLng,
    altitude: pos1.altitude + (pos2.altitude - pos1.altitude) * t,
    velocity: pos1.velocity + (pos2.velocity - pos1.velocity) * t,
    timestamp: pos1.timestamp + (pos2.timestamp - pos1.timestamp) * t,
  };
}
