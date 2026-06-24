import type { Planet } from "@/types";

/**
 * Simplified planetary position calculator.
 * Uses mean orbital elements for approximate positions.
 * Accurate enough for visualization purposes.
 */

interface OrbitalElements {
  name: string;
  L0: number; // Mean longitude at epoch (degrees)
  Lrate: number; // Rate of change (degrees/century)
  period: number; // Orbital period in days
  magnitude: number; // Approximate visual magnitude
  distance: number; // Mean distance from Sun (AU)
}

const PLANETS: OrbitalElements[] = [
  { name: "Mercury", L0: 252.251, Lrate: 149472.675, period: 87.97, magnitude: -0.4, distance: 0.387 },
  { name: "Venus", L0: 181.98, Lrate: 58517.816, period: 224.7, magnitude: -4.1, distance: 0.723 },
  { name: "Mars", L0: 355.433, Lrate: 19140.299, period: 686.98, magnitude: -1.0, distance: 1.524 },
  { name: "Jupiter", L0: 34.351, Lrate: 3034.906, period: 4332.59, magnitude: -2.2, distance: 5.203 },
  { name: "Saturn", L0: 50.077, Lrate: 1222.114, period: 10759.22, magnitude: 0.5, distance: 9.537 },
  { name: "Uranus", L0: 314.055, Lrate: 428.947, period: 30685.4, magnitude: 5.7, distance: 19.19 },
  { name: "Neptune", L0: 304.349, Lrate: 218.486, period: 60190, magnitude: 7.8, distance: 30.07 },
];

function julianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;

  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045.5
  );
}

function localSiderealTime(jd: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * 0.000387933;
  gst = ((gst % 360) + 360) % 360;
  return ((gst + longitude) % 360 + 360) % 360;
}

function equatorialToHorizontal(
  ra: number,
  dec: number,
  lat: number,
  lst: number
): { azimuth: number; elevation: number } {
  const ha = ((lst - ra + 360) % 360) * (Math.PI / 180);
  const decRad = dec * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);

  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
  const altitude = Math.asin(sinAlt) * (180 / Math.PI);

  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);

  if (Math.sin(ha) > 0) azimuth = 360 - azimuth;

  return { azimuth, elevation: altitude };
}

export function computePlanetPositions(
  latitude: number,
  longitude: number,
  date: Date
): Planet[] {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const lst = localSiderealTime(jd, longitude);

  return PLANETS.map((planet) => {
    // Compute approximate ecliptic longitude
    const meanLongitude = (planet.L0 + planet.Lrate * T) % 360;

    // Simplified: ecliptic to equatorial (assuming 0 ecliptic latitude)
    const obliquity = 23.4393;
    const eclLongRad = (meanLongitude * Math.PI) / 180;
    const oblRad = (obliquity * Math.PI) / 180;

    const ra =
      (Math.atan2(
        Math.sin(eclLongRad) * Math.cos(oblRad),
        Math.cos(eclLongRad)
      ) *
        180) /
      Math.PI;
    const dec =
      (Math.asin(Math.sin(eclLongRad) * Math.sin(oblRad)) * 180) / Math.PI;

    const raPositive = ((ra % 360) + 360) % 360;
    const { azimuth, elevation } = equatorialToHorizontal(raPositive, dec, latitude, lst);

    // Approximate rise/set times
    const hourAngle = Math.acos(
      Math.max(-1, Math.min(1, -Math.tan((latitude * Math.PI) / 180) * Math.tan((dec * Math.PI) / 180)))
    );
    const riseHour = 12 - (hourAngle * 180) / Math.PI / 15;
    const setHour = 12 + (hourAngle * 180) / Math.PI / 15;

    const formatHour = (h: number) => {
      const hours = Math.floor(((h % 24) + 24) % 24);
      const minutes = Math.floor((h % 1) * 60);
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    };

    return {
      name: planet.name,
      rightAscension: raPositive,
      declination: dec,
      magnitude: planet.magnitude,
      distance: planet.distance,
      azimuth,
      elevation,
      isVisible: elevation > 0,
      riseTime: formatHour(riseHour),
      setTime: formatHour(setHour),
      transitTime: formatHour(12),
    };
  });
}

// Moon position (simplified)
export function computeMoonPosition(latitude: number, longitude: number, date: Date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const lst = localSiderealTime(jd, longitude);

  // Simplified lunar position
  const L = (218.316 + 13.176396 * (jd - 2451545.0)) % 360;
  const M = (134.963 + 13.064993 * (jd - 2451545.0)) % 360;
  const F = (93.272 + 13.229350 * (jd - 2451545.0)) % 360;

  const eclLong = L + 6.289 * Math.sin((M * Math.PI) / 180);
  const eclLat = 5.128 * Math.sin((F * Math.PI) / 180);

  const obliquity = 23.4393;
  const eclLongRad = (eclLong * Math.PI) / 180;
  const eclLatRad = (eclLat * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;

  const ra =
    (Math.atan2(
      Math.sin(eclLongRad) * Math.cos(oblRad) - Math.tan(eclLatRad) * Math.sin(oblRad),
      Math.cos(eclLongRad)
    ) * 180) / Math.PI;
  const dec =
    (Math.asin(
      Math.sin(eclLatRad) * Math.cos(oblRad) +
        Math.cos(eclLatRad) * Math.sin(oblRad) * Math.sin(eclLongRad)
    ) * 180) / Math.PI;

  const raPositive = ((ra % 360) + 360) % 360;
  const { azimuth, elevation } = equatorialToHorizontal(raPositive, dec, latitude, lst);

  // Moon phase (simplified)
  const sunMeanLong = (280.46646 + 36000.76983 * T) % 360;
  const elongation = eclLong - sunMeanLong;
  const phase = (1 - Math.cos((elongation * Math.PI) / 180)) / 2;

  return {
    name: "Moon",
    rightAscension: raPositive,
    declination: dec,
    magnitude: -12.7 + 2.5 * Math.log10(Math.max(0.01, phase)),
    distance: 0.00257, // AU
    azimuth,
    elevation,
    isVisible: elevation > 0,
    phase,
  };
}

// Sun position
export function computeSunPosition(latitude: number, longitude: number, date: Date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525.0;
  const lst = localSiderealTime(jd, longitude);

  // Mean longitude and mean anomaly of the Sun
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  const M = (357.52911 + 35999.05029 * T) % 360;
  const Mrad = (M * Math.PI) / 180;

  // Equation of center
  const C = (1.9146 - 0.004817 * T) * Math.sin(Mrad) +
    0.019993 * Math.sin(2 * Mrad) +
    0.00029 * Math.sin(3 * Mrad);

  // Sun's ecliptic longitude
  const sunLong = L0 + C;
  const obliquity = 23.4393 - 0.01300 * T;

  const eclLongRad = (sunLong * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;

  // Equatorial coordinates
  const ra =
    (Math.atan2(
      Math.sin(eclLongRad) * Math.cos(oblRad),
      Math.cos(eclLongRad)
    ) * 180) / Math.PI;
  const dec =
    (Math.asin(Math.sin(eclLongRad) * Math.sin(oblRad)) * 180) / Math.PI;

  const raPositive = ((ra % 360) + 360) % 360;
  const { azimuth, elevation } = equatorialToHorizontal(raPositive, dec, latitude, lst);

  // Sunrise/sunset approximation
  const hourAngle = Math.acos(
    Math.max(-1, Math.min(1,
      (Math.sin((-0.833 * Math.PI) / 180) - Math.sin((latitude * Math.PI) / 180) * Math.sin((dec * Math.PI) / 180)) /
      (Math.cos((latitude * Math.PI) / 180) * Math.cos((dec * Math.PI) / 180))
    ))
  );
  const riseHour = 12 - (hourAngle * 180) / Math.PI / 15;
  const setHour = 12 + (hourAngle * 180) / Math.PI / 15;

  const formatHour = (h: number) => {
    const hours = Math.floor(((h % 24) + 24) % 24);
    const minutes = Math.floor(Math.abs(h % 1) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  return {
    name: "Sun",
    rightAscension: raPositive,
    declination: dec,
    magnitude: -26.74,
    distance: 1.0, // AU
    azimuth,
    elevation,
    isVisible: elevation > 0,
    riseTime: formatHour(riseHour),
    setTime: formatHour(setHour),
  };
}
