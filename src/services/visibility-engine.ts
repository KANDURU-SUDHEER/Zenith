/**
 * Observer-Based Visibility Engine
 * 
 * Single source of truth for determining whether a celestial object
 * is visible from a given observer location.
 * 
 * Used by: Radar, Sidebar counts, Details panel, AI Sky Guide.
 * NOT used by: Globe (globe shows all objects globally).
 * 
 * Computes proper look angles (azimuth + elevation) from an observer
 * to a satellite/object, accounting for Earth's curvature.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LookAngles {
  azimuth: number;   // degrees, 0=North, clockwise
  elevation: number; // degrees, negative = below horizon
  range: number;     // km distance from observer to object
}

export interface ObserverPosition {
  latitude: number;  // degrees
  longitude: number; // degrees
  altitude?: number; // km above sea level (default 0)
}

export interface TargetPosition {
  latitude: number;  // degrees
  longitude: number; // degrees
  altitude: number;  // km above sea level
}

// ─── Core Look Angle Calculation ─────────────────────────────────────────────

/**
 * Compute the look angles (azimuth, elevation, range) from an observer
 * on Earth's surface to a target object in space.
 * 
 * Uses the proper geometric calculation accounting for Earth's curvature.
 * This is equivalent to the satellite.js ecfToLookAngles calculation.
 */
export function computeLookAngles(
  observer: ObserverPosition,
  target: TargetPosition
): LookAngles {
  const obsLat = observer.latitude * DEG_TO_RAD;
  const obsLon = observer.longitude * DEG_TO_RAD;
  const obsAlt = observer.altitude || 0;

  const tgtLat = target.latitude * DEG_TO_RAD;
  const tgtLon = target.longitude * DEG_TO_RAD;
  const tgtAlt = target.altitude;

  // Convert observer to ECEF (Earth-Centered, Earth-Fixed)
  const obsR = EARTH_RADIUS_KM + obsAlt;
  const obsX = obsR * Math.cos(obsLat) * Math.cos(obsLon);
  const obsY = obsR * Math.cos(obsLat) * Math.sin(obsLon);
  const obsZ = obsR * Math.sin(obsLat);

  // Convert target to ECEF
  const tgtR = EARTH_RADIUS_KM + tgtAlt;
  const tgtX = tgtR * Math.cos(tgtLat) * Math.cos(tgtLon);
  const tgtY = tgtR * Math.cos(tgtLat) * Math.sin(tgtLon);
  const tgtZ = tgtR * Math.sin(tgtLat);

  // Range vector (target - observer) in ECEF
  const rx = tgtX - obsX;
  const ry = tgtY - obsY;
  const rz = tgtZ - obsZ;

  const range = Math.sqrt(rx * rx + ry * ry + rz * rz);

  // Transform range vector to topocentric (South, East, Up) frame
  const sinLat = Math.sin(obsLat);
  const cosLat = Math.cos(obsLat);
  const sinLon = Math.sin(obsLon);
  const cosLon = Math.cos(obsLon);

  // Rotation from ECEF to SEU (South-East-Up)
  const south = sinLat * cosLon * rx + sinLat * sinLon * ry - cosLat * rz;
  const east = -sinLon * rx + cosLon * ry;
  const up = cosLat * cosLon * rx + cosLat * sinLon * ry + sinLat * rz;

  // Elevation (angle above horizon)
  const elevation = Math.atan2(up, Math.sqrt(south * south + east * east)) * RAD_TO_DEG;

  // Azimuth (angle from North, clockwise)
  // Note: topocentric frame uses South, so azimuth from North = atan2(east, -south) + adjustments
  let azimuth = Math.atan2(east, -south) * RAD_TO_DEG;
  if (azimuth < 0) azimuth += 360;

  return { azimuth, elevation, range };
}

// ─── Visibility Check ────────────────────────────────────────────────────────

/**
 * Check if a target is visible (above horizon) from the observer.
 * Returns true if elevation > 0°.
 */
export function isVisibleFromObserver(
  observer: ObserverPosition,
  target: TargetPosition
): boolean {
  const angles = computeLookAngles(observer, target);
  return angles.elevation > 0;
}

/**
 * Filter an array of targets to only those visible from the observer.
 * Returns targets with their computed look angles.
 */
export function getVisibleObjects<T extends TargetPosition>(
  observer: ObserverPosition,
  targets: T[]
): Array<T & { lookAngles: LookAngles }> {
  const visible: Array<T & { lookAngles: LookAngles }> = [];

  for (const target of targets) {
    const lookAngles = computeLookAngles(observer, target);
    if (lookAngles.elevation > 0) {
      visible.push({ ...target, lookAngles });
    }
  }

  return visible;
}
