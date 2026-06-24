/**
 * Celestial Engine — Scientific Core of Project Zenith
 *
 * Single shared engine for all astronomical calculations.
 * Uses the astronomy-engine library (same algorithms as USNO/JPL).
 *
 * Consumed by: Radar, Sidebar, Details Panel, AI Sky Guide, Globe overlays.
 * All calculations are observer-based using real ephemeris data.
 */

import * as Astronomy from "astronomy-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Observer {
  latitude: number;
  longitude: number;
  elevation?: number; // meters above sea level
}

export interface CelestialBody {
  name: string;
  type: "sun" | "moon" | "planet";
  azimuth: number;
  elevation: number;
  distance: number; // AU
  magnitude: number;
  ra: number; // right ascension (hours)
  dec: number; // declination (degrees)
  riseTime: string | null;
  setTime: string | null;
  transitTime: string | null;
  isVisible: boolean; // elevation > 0
  constellation: string;
  angularDiameter?: number; // arcseconds
}

export interface SunData extends CelestialBody {
  solarNoon: string;
  sunrise: string | null;
  sunset: string | null;
  civilDawn: string | null;
  civilDusk: string | null;
  nauticalDawn: string | null;
  nauticalDusk: string | null;
  astronomicalDawn: string | null;
  astronomicalDusk: string | null;
  goldenHourStart: string | null;
  goldenHourEnd: string | null;
  blueHourStart: string | null;
  blueHourEnd: string | null;
  daylightDuration: number; // minutes
  nightDuration: number; // minutes
}

export interface MoonData extends CelestialBody {
  illumination: number; // 0-100%
  phase: string;
  phaseAngle: number;
  moonAge: number; // days into lunation
  moonRise: string | null;
  moonSet: string | null;
  nextFullMoon: string;
  nextNewMoon: string;
}

export interface CelestialSnapshot {
  observer: Observer;
  timestamp: Date;
  sun: SunData;
  moon: MoonData;
  planets: CelestialBody[];
  jupiterMoons: JupiterMoonData[];
}

export interface JupiterMoonData {
  name: string;
  /** Offset from Jupiter in Jupiter radii (x = East, y = North relative to Jupiter) */
  offsetX: number;
  offsetY: number;
  /** Distance from Jupiter center in Jupiter radii */
  distanceFromJupiter: number;
  /** Whether the moon is behind Jupiter (occultation) */
  isBehindJupiter: boolean;
}

// ─── Astronomy Engine Observer ───────────────────────────────────────────────

function makeObserver(obs: Observer): Astronomy.Observer {
  return new Astronomy.Observer(obs.latitude, obs.longitude, (obs.elevation || 0) / 1000);
}

// ─── Time Formatting ─────────────────────────────────────────────────────────

function formatTime(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Constellation Lookup ────────────────────────────────────────────────────

function getConstellation(ra: number, dec: number): string {
  try {
    const result = Astronomy.Constellation(ra, dec);
    return result.name;
  } catch {
    return "Unknown";
  }
}

// ─── Rise/Set/Transit ────────────────────────────────────────────────────────

function getRiseSetTransit(
  body: Astronomy.Body,
  observer: Astronomy.Observer,
  date: Date
): { rise: Date | null; set: Date | null; transit: Date | null } {
  const startTime = new Date(date);
  startTime.setHours(0, 0, 0, 0);
  const astroTime = Astronomy.MakeTime(startTime);

  let rise: Date | null = null;
  let set: Date | null = null;
  let transit: Date | null = null;

  try {
    const riseEvent = Astronomy.SearchRiseSet(body, observer, +1, astroTime, 1);
    if (riseEvent) rise = riseEvent.date;
  } catch { /* no rise today */ }

  try {
    const setEvent = Astronomy.SearchRiseSet(body, observer, -1, astroTime, 1);
    if (setEvent) set = setEvent.date;
  } catch { /* no set today */ }

  try {
    const transitEvent = Astronomy.SearchHourAngle(body, observer, 0, astroTime, +1);
    if (transitEvent) transit = transitEvent.time.date;
  } catch { /* no transit */ }

  return { rise, set, transit };
}

// ─── Sun Twilight Calculations ───────────────────────────────────────────────

function searchSunAltitude(
  observer: Astronomy.Observer,
  altitude: number,
  direction: number,
  date: Date
): Date | null {
  const startTime = new Date(date);
  startTime.setHours(0, 0, 0, 0);
  const astroTime = Astronomy.MakeTime(startTime);

  try {
    const result = Astronomy.SearchAltitude(
      Astronomy.Body.Sun,
      observer,
      direction,
      astroTime,
      1,
      altitude
    );
    return result ? result.date : null;
  } catch {
    return null;
  }
}

// ─── Compute Sun ─────────────────────────────────────────────────────────────

export function computeSun(observer: Observer, date: Date): SunData {
  const obs = makeObserver(observer);
  const astroTime = Astronomy.MakeTime(date);

  // Position
  const equatorial = Astronomy.Equator(Astronomy.Body.Sun, astroTime, obs, true, true);
  const horizontal = Astronomy.Horizon(astroTime, obs, equatorial.ra, equatorial.dec, "normal");

  const ra = equatorial.ra;
  const dec = equatorial.dec;
  const distance = equatorial.dist;
  const azimuth = horizontal.azimuth;
  const elevation = horizontal.altitude;

  // Rise/Set/Transit
  const { rise, set, transit } = getRiseSetTransit(Astronomy.Body.Sun, obs, date);

  // Twilight times
  const civilDawn = searchSunAltitude(obs, -6, +1, date);
  const civilDusk = searchSunAltitude(obs, -6, -1, date);
  const nauticalDawn = searchSunAltitude(obs, -12, +1, date);
  const nauticalDusk = searchSunAltitude(obs, -12, -1, date);
  const astronomicalDawn = searchSunAltitude(obs, -18, +1, date);
  const astronomicalDusk = searchSunAltitude(obs, -18, -1, date);

  // Golden hour (Sun 0° to 6° above horizon)
  const goldenHourStart = searchSunAltitude(obs, 6, -1, date); // evening
  const goldenHourEnd = set;
  // Blue hour (Sun -4° to -6° below horizon)
  const blueHourStart = searchSunAltitude(obs, -4, -1, date);
  const blueHourEnd = civilDusk;

  // Daylight / night duration
  let daylightDuration = 0;
  let nightDuration = 1440;
  if (rise && set) {
    daylightDuration = (set.getTime() - rise.getTime()) / 60000;
    nightDuration = 1440 - daylightDuration;
  }

  // Angular diameter
  const angularDiameter = 1919.26 / distance; // arcsec (Sun's mean = 1919.26" at 1 AU)

  const constellation = getConstellation(ra, dec);

  return {
    name: "Sun",
    type: "sun",
    azimuth,
    elevation,
    distance,
    magnitude: -26.74,
    ra,
    dec,
    riseTime: formatTime(rise),
    setTime: formatTime(set),
    transitTime: formatTime(transit),
    isVisible: elevation > 0,
    constellation,
    angularDiameter,
    solarNoon: formatTime(transit) || "—",
    sunrise: formatTime(rise),
    sunset: formatTime(set),
    civilDawn: formatTime(civilDawn),
    civilDusk: formatTime(civilDusk),
    nauticalDawn: formatTime(nauticalDawn),
    nauticalDusk: formatTime(nauticalDusk),
    astronomicalDawn: formatTime(astronomicalDawn),
    astronomicalDusk: formatTime(astronomicalDusk),
    goldenHourStart: formatTime(goldenHourStart),
    goldenHourEnd: formatTime(goldenHourEnd),
    blueHourStart: formatTime(blueHourStart),
    blueHourEnd: formatTime(blueHourEnd),
    daylightDuration,
    nightDuration,
  };
}

// ─── Compute Moon ────────────────────────────────────────────────────────────

export function computeMoon(observer: Observer, date: Date): MoonData {
  const obs = makeObserver(observer);
  const astroTime = Astronomy.MakeTime(date);

  // Position
  const equatorial = Astronomy.Equator(Astronomy.Body.Moon, astroTime, obs, true, true);
  const horizontal = Astronomy.Horizon(astroTime, obs, equatorial.ra, equatorial.dec, "normal");

  const ra = equatorial.ra;
  const dec = equatorial.dec;
  const distance = equatorial.dist; // AU
  const azimuth = horizontal.azimuth;
  const elevation = horizontal.altitude;

  // Illumination
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);
  const illumination = illum.phase_fraction * 100;
  const phaseAngle = illum.phase_angle;

  // Moon phase name
  const moonPhase = Astronomy.MoonPhase(astroTime);
  const phase = getMoonPhaseName(moonPhase);

  // Moon age (days into current lunation)
  const moonAge = moonPhase / (360 / 29.53);

  // Rise/Set
  const { rise, set, transit } = getRiseSetTransit(Astronomy.Body.Moon, obs, date);

  // Next full moon / new moon
  const nextFull = Astronomy.SearchMoonQuarter(astroTime);
  let nextFullMoon = date;
  let nextNewMoon = date;

  // Search for full moon (quarter = 2) and new moon (quarter = 0)
  let quarter = nextFull;
  for (let i = 0; i < 8; i++) {
    if (quarter.quarter === 2 && quarter.time.date > date) {
      nextFullMoon = quarter.time.date;
      break;
    }
    quarter = Astronomy.NextMoonQuarter(quarter);
  }

  quarter = nextFull;
  for (let i = 0; i < 8; i++) {
    if (quarter.quarter === 0 && quarter.time.date > date) {
      nextNewMoon = quarter.time.date;
      break;
    }
    quarter = Astronomy.NextMoonQuarter(quarter);
  }

  // Magnitude (approximate)
  const magnitude = -12.7 + 2.5 * Math.log10(Math.max(0.001, 1 - illum.phase_fraction));

  // Angular diameter
  const distKm = distance * 149597870.7; // AU to km
  const angularDiameter = (2 * 1737.4 / distKm) * 206265; // arcsec

  const constellation = getConstellation(ra, dec);

  return {
    name: "Moon",
    type: "moon",
    azimuth,
    elevation,
    distance,
    magnitude,
    ra,
    dec,
    riseTime: formatTime(rise),
    setTime: formatTime(set),
    transitTime: formatTime(transit),
    isVisible: elevation > 0,
    constellation,
    angularDiameter,
    illumination,
    phase,
    phaseAngle,
    moonAge,
    moonRise: formatTime(rise),
    moonSet: formatTime(set),
    nextFullMoon: formatDate(nextFullMoon),
    nextNewMoon: formatDate(nextNewMoon),
  };
}

function getMoonPhaseName(angle: number): string {
  if (angle < 22.5) return "New Moon";
  if (angle < 67.5) return "Waxing Crescent";
  if (angle < 112.5) return "First Quarter";
  if (angle < 157.5) return "Waxing Gibbous";
  if (angle < 202.5) return "Full Moon";
  if (angle < 247.5) return "Waning Gibbous";
  if (angle < 292.5) return "Last Quarter";
  if (angle < 337.5) return "Waning Crescent";
  return "New Moon";
}

// ─── Compute Planet ──────────────────────────────────────────────────────────

const PLANET_BODIES: Array<{ name: string; body: Astronomy.Body }> = [
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn", body: Astronomy.Body.Saturn },
  { name: "Uranus", body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
];

export function computePlanets(observer: Observer, date: Date): CelestialBody[] {
  const obs = makeObserver(observer);
  const astroTime = Astronomy.MakeTime(date);

  return PLANET_BODIES.map(({ name, body }) => {
    const equatorial = Astronomy.Equator(body, astroTime, obs, true, true);
    const horizontal = Astronomy.Horizon(astroTime, obs, equatorial.ra, equatorial.dec, "normal");

    const ra = equatorial.ra;
    const dec = equatorial.dec;
    const distance = equatorial.dist;
    const azimuth = horizontal.azimuth;
    const elevation = horizontal.altitude;

    // Visual magnitude
    const illum = Astronomy.Illumination(body, astroTime);
    const magnitude = illum.mag;

    // Rise/Set/Transit
    const { rise, set, transit } = getRiseSetTransit(body, obs, date);

    const constellation = getConstellation(ra, dec);

    return {
      name,
      type: "planet" as const,
      azimuth,
      elevation,
      distance,
      magnitude,
      ra,
      dec,
      riseTime: formatTime(rise),
      setTime: formatTime(set),
      transitTime: formatTime(transit),
      isVisible: elevation > 0,
      constellation,
    };
  });
}

// ─── Jupiter Moons ───────────────────────────────────────────────────────────

/**
 * Compute positions of Jupiter's 4 Galilean moons.
 * Returns positions relative to Jupiter (in Jupiter radii).
 */
export function computeJupiterMoons(date: Date): JupiterMoonData[] {
  const astroTime = Astronomy.MakeTime(date);
  const moons = Astronomy.JupiterMoons(astroTime);

  const JUPITER_RADIUS_AU = 71492 / 149597870.7; // Jupiter radius in AU
  const names = ["Io", "Europa", "Ganymede", "Callisto"];
  const moonKeys = ["io", "europa", "ganymede", "callisto"] as const;

  return moonKeys.map((key, i) => {
    const moon = moons[key];
    // x,y,z are offsets from Jupiter in AU
    // Convert to Jupiter radii for display
    const offsetX = moon.x / JUPITER_RADIUS_AU;
    const offsetY = moon.y / JUPITER_RADIUS_AU;
    const dist = Math.sqrt(moon.x ** 2 + moon.y ** 2 + moon.z ** 2) / JUPITER_RADIUS_AU;

    // Moon is behind Jupiter if z < 0 and distance from center < 1 Jupiter radius projected
    const projectedDist = Math.sqrt(moon.x ** 2 + moon.y ** 2) / JUPITER_RADIUS_AU;
    const isBehind = moon.z < 0 && projectedDist < 1;

    return {
      name: names[i]!,
      offsetX,
      offsetY,
      distanceFromJupiter: dist,
      isBehindJupiter: isBehind,
    };
  });
}

// ─── Complete Celestial Snapshot ──────────────────────────────────────────────

/**
 * Compute the full celestial state for an observer at a given time.
 * This is the primary API consumed by all UI components.
 */
export function computeCelestialSnapshot(
  observer: Observer,
  date: Date = new Date()
): CelestialSnapshot {
  const sun = computeSun(observer, date);
  const moon = computeMoon(observer, date);
  const planets = computePlanets(observer, date);
  const jupiterMoons = computeJupiterMoons(date);

  return {
    observer,
    timestamp: date,
    sun,
    moon,
    planets,
    jupiterMoons,
  };
}
