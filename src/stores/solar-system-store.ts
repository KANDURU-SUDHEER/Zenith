"use client";

import { create } from "zustand";

export type PlanetId = "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

export interface PlanetData {
  id: PlanetId;
  name: string;
  color: string;
  radius: number;        // Visual radius in pixels (scaled for display)
  orbitRadius: number;   // AU from Sun (used for positioning)
  period: number;        // Orbital period in Earth days
  inclination: number;   // Orbital inclination in degrees
  eccentricity: number;  // Orbital eccentricity
  meanLongJ2000: number; // Mean longitude at J2000 epoch (degrees)
  dailyMotion: number;   // Mean daily motion (degrees/day)
}

export const PLANETS: PlanetData[] = [
  { id: "mercury", name: "Mercury", color: "#a0a0a0", radius: 4, orbitRadius: 0.387, period: 87.97, inclination: 7.0, eccentricity: 0.2056, meanLongJ2000: 252.25, dailyMotion: 4.0923 },
  { id: "venus", name: "Venus", color: "#e8c090", radius: 6, orbitRadius: 0.723, period: 224.7, inclination: 3.39, eccentricity: 0.0068, meanLongJ2000: 181.98, dailyMotion: 1.6021 },
  { id: "earth", name: "Earth", color: "#4a9eff", radius: 6, orbitRadius: 1.0, period: 365.25, inclination: 0.0, eccentricity: 0.0167, meanLongJ2000: 100.46, dailyMotion: 0.9856 },
  { id: "mars", name: "Mars", color: "#c05030", radius: 5, orbitRadius: 1.524, period: 687.0, inclination: 1.85, eccentricity: 0.0934, meanLongJ2000: 355.45, dailyMotion: 0.5240 },
  { id: "jupiter", name: "Jupiter", color: "#c8a060", radius: 14, orbitRadius: 5.203, period: 4332.6, inclination: 1.31, eccentricity: 0.0484, meanLongJ2000: 34.40, dailyMotion: 0.0831 },
  { id: "saturn", name: "Saturn", color: "#d4b896", radius: 12, orbitRadius: 9.537, period: 10759.2, inclination: 2.49, eccentricity: 0.0542, meanLongJ2000: 49.94, dailyMotion: 0.0335 },
  { id: "uranus", name: "Uranus", color: "#7dd4c0", radius: 9, orbitRadius: 19.19, period: 30688.5, inclination: 0.77, eccentricity: 0.0472, meanLongJ2000: 313.23, dailyMotion: 0.0117 },
  { id: "neptune", name: "Neptune", color: "#4060d0", radius: 9, orbitRadius: 30.07, period: 60182.0, inclination: 1.77, eccentricity: 0.0086, meanLongJ2000: 304.88, dailyMotion: 0.0060 },
];

interface SolarSystemState {
  selectedPlanet: PlanetId | null;
  hoveredPlanet: PlanetId | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotationX: number;
  rotationZ: number;
  showOrbits: boolean;
  showLabels: boolean;

  // Actions
  selectPlanet: (id: PlanetId | null) => void;
  setHoveredPlanet: (id: PlanetId | null) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  setRotation: (rx: number, rz: number) => void;
  resetView: () => void;
  toggleOrbits: () => void;
  toggleLabels: () => void;
}

export const useSolarSystemStore = create<SolarSystemState>((set) => ({
  selectedPlanet: null,
  hoveredPlanet: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotationX: -0.95,
  rotationZ: 0,
  showOrbits: true,
  showLabels: true,

  selectPlanet: (id) => set({ selectedPlanet: id }),
  setHoveredPlanet: (id) => set({ hoveredPlanet: id }),
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(8, zoom)) }),
  setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
  setRotation: (rx, rz) => set({ rotationX: Math.max(-Math.PI / 2, Math.min(-0.05, rx)), rotationZ: rz }),
  resetView: () => set({ zoom: 1, offsetX: 0, offsetY: 0, rotationX: -0.95, rotationZ: 0, selectedPlanet: null }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
}));

// ─── Orbital Mechanics ───────────────────────────────────────────────────────

const J2000_EPOCH = new Date("2000-01-01T12:00:00Z").getTime();

/**
 * Compute planet position in AU at a given date using Keplerian elements.
 * Returns [x, y] in the ecliptic plane.
 */
export function computePlanetPosition(planet: PlanetData, date: Date): { x: number; y: number } {
  const daysSinceJ2000 = (date.getTime() - J2000_EPOCH) / 86400000;

  // Mean longitude
  const L = ((planet.meanLongJ2000 + planet.dailyMotion * daysSinceJ2000) % 360 + 360) % 360;

  // Mean anomaly (simplified — using longitude as proxy for M)
  const M = L * (Math.PI / 180);

  // Solve Kepler's equation (1 iteration of Newton's method — sufficient for low eccentricity)
  const e = planet.eccentricity;
  let E = M + e * Math.sin(M);
  E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

  // True anomaly
  const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const sinV = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
  const v = Math.atan2(sinV, cosV);

  // Radius
  const r = planet.orbitRadius * (1 - e * Math.cos(E));

  // Position in orbital plane (apply inclination for 3D-ish look)
  const inclRad = planet.inclination * (Math.PI / 180);
  const x = r * Math.cos(v);
  const y = r * Math.sin(v) * Math.cos(inclRad);

  return { x, y };
}
