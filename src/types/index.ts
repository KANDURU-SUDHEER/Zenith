/** Geographic coordinate on Earth */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  name?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  displayName?: string;
  source?: string;
  timestamp?: number;
}

/** ISS position data */
export interface ISSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

/** Satellite tracking data */
export interface Satellite {
  id: string;
  name: string;
  noradId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  type: SatelliteType;
  category: SatelliteCategory;
  visible: boolean;
  inclination?: number;
  period?: number;
  operator?: string;
  launchYear?: number;
  orbitType?: OrbitType;
  lastUpdated?: number;
}

export type SatelliteType =
  | "communication"
  | "weather"
  | "navigation"
  | "scientific"
  | "military"
  | "debris"
  | "other";

export type SatelliteCategory =
  | "iss"
  | "starlink"
  | "gps"
  | "weather"
  | "communication"
  | "earth-observation"
  | "scientific"
  | "space-stations"
  | "military"
  | "debris"
  | "other";

export type OrbitType = "LEO" | "MEO" | "GEO" | "HEO" | "SSO" | "unknown";

/** TLE (Two-Line Element) data */
export interface TLEData {
  name: string;
  line1: string;
  line2: string;
  noradId: number;
  category: SatelliteCategory;
}

/** Propagated satellite position */
export interface PropagatedPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
}

/** Orbit path point */
export interface OrbitPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: number;
}

/** Satellite pass prediction */
export interface SatellitePass {
  startTime: Date;
  startAzimuth: number;
  maxElevation: number;
  maxElevationTime: Date;
  maxAzimuth: number;
  endTime: Date;
  endAzimuth: number;
  duration: number; // seconds
  brightness?: number;
}

/** ISS-specific extended data */
export interface ISSData extends ISSPosition {
  orbitPath: OrbitPoint[];
  trail: OrbitPoint[];
  nextPass: SatellitePass | null;
  speedKmS: number;
  speedKmH: number;
  speedMph: number;
}

/** Satellite filter state */
export interface SatelliteFilters {
  iss: boolean;
  starlink: boolean;
  gps: boolean;
  weather: boolean;
  communication: boolean;
  scientific: boolean;
  earthObservation: boolean;
  spaceStations: boolean;
  military: boolean;
  debris: boolean;
  [key: string]: boolean;
}

/** Satellite category metadata */
export interface CategoryMeta {
  id: SatelliteCategory;
  label: string;
  color: string;
  icon: string;
  tleGroup: string;
}

/** Planet data */
export interface Planet {
  name: string;
  rightAscension: number;
  declination: number;
  magnitude: number;
  distance: number;
  phase?: number;
  riseTime?: string;
  setTime?: string;
  transitTime?: string;
  isVisible: boolean;
  azimuth: number;
  elevation: number;
}

/** Constellation data */
export interface Constellation {
  name: string;
  abbreviation: string;
  rightAscension: number;
  declination: number;
  stars: ConstellationStar[];
  isVisible: boolean;
  description: string;
}

export interface ConstellationStar {
  name: string;
  rightAscension: number;
  declination: number;
  magnitude: number;
}

/** Celestial object for the zenith radar */
export interface CelestialObject {
  id: string;
  name: string;
  type: CelestialObjectType;
  azimuth: number;
  elevation: number;
  magnitude?: number;
  distance?: number;
  riseTime?: string;
  setTime?: string;
  description?: string;
}

export type CelestialObjectType =
  | "planet"
  | "star"
  | "satellite"
  | "constellation"
  | "iss"
  | "moon";

/** API response wrapper for resilience pattern */
export interface ApiResponse<T> {
  data: T;
  source: DataSource;
  timestamp: number;
  stale: boolean;
}

export type DataSource = "live" | "cache" | "mock";

/** AI Sky Guide message */
export interface SkyGuideMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/** Navigation link */
export interface NavLink {
  label: string;
  href: string;
}

/** Feature card data */
export interface Feature {
  title: string;
  description: string;
  icon: string;
}
