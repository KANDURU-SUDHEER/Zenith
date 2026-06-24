"use client";

import { useState, useMemo, useEffect } from "react";
import { Rocket, ArrowRight, Clock, Radio, Gauge, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulationClock } from "@/stores/simulation-clock";
import { PLANETS, computePlanetPosition, type PlanetId } from "@/stores/solar-system-store";

// ─── Transport Methods (real speeds) ─────────────────────────────────────────

interface TransportMethod {
  id: string;
  name: string;
  speed: number; // km/s
  description: string;
}

const TRANSPORT_METHODS: TransportMethod[] = [
  { id: "apollo", name: "Apollo", speed: 11.08, description: "Apollo missions — 11.08 km/s" },
  { id: "voyager", name: "Voyager 1", speed: 17.0, description: "Voyager 1 — 17.0 km/s" },
  { id: "new-horizons", name: "New Horizons", speed: 16.26, description: "New Horizons — 16.26 km/s" },
  { id: "parker", name: "Parker Solar Probe", speed: 192.0, description: "Parker Solar Probe — 192 km/s (peak)" },
  { id: "ion", name: "Ion Engine", speed: 40.0, description: "NEXT Ion Engine — 40 km/s" },
  { id: "starship", name: "Future Starship", speed: 30.0, description: "SpaceX Starship (estimated) — 30 km/s" },
  { id: "light", name: "Light Speed", speed: 299792.458, description: "Speed of light — 299,792 km/s" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const AU_KM = 149597870.7; // 1 AU in km
const LIGHT_SPEED = 299792.458; // km/s

// Min/Max distances between planets in AU (from NASA data)
const PLANET_DISTANCES: Record<string, { min: number; max: number }> = {
  "mercury-venus": { min: 0.26, max: 1.14 },
  "mercury-earth": { min: 0.55, max: 1.45 },
  "mercury-mars": { min: 0.55, max: 2.58 },
  "mercury-jupiter": { min: 4.42, max: 6.18 },
  "mercury-saturn": { min: 8.77, max: 10.53 },
  "mercury-uranus": { min: 18.41, max: 19.97 },
  "mercury-neptune": { min: 29.30, max: 30.84 },
  "venus-earth": { min: 0.26, max: 1.74 },
  "venus-mars": { min: 0.40, max: 2.65 },
  "venus-jupiter": { min: 4.08, max: 6.32 },
  "venus-saturn": { min: 8.43, max: 10.67 },
  "venus-uranus": { min: 18.07, max: 20.11 },
  "venus-neptune": { min: 28.96, max: 30.98 },
  "earth-mars": { min: 0.37, max: 2.68 },
  "earth-jupiter": { min: 3.93, max: 6.47 },
  "earth-saturn": { min: 8.01, max: 11.08 },
  "earth-uranus": { min: 17.29, max: 21.09 },
  "earth-neptune": { min: 28.81, max: 31.33 },
  "mars-jupiter": { min: 3.68, max: 6.73 },
  "mars-saturn": { min: 7.99, max: 11.07 },
  "mars-uranus": { min: 17.65, max: 20.71 },
  "mars-neptune": { min: 28.53, max: 31.59 },
  "jupiter-saturn": { min: 4.33, max: 14.73 },
  "jupiter-uranus": { min: 13.98, max: 24.39 },
  "jupiter-neptune": { min: 24.87, max: 35.27 },
  "saturn-uranus": { min: 9.65, max: 28.73 },
  "saturn-neptune": { min: 20.53, max: 39.61 },
  "uranus-neptune": { min: 10.88, max: 49.27 },
};

function getMinMaxDistance(from: PlanetId, to: PlanetId): { min: number; max: number } {
  const key1 = `${from}-${to}`;
  const key2 = `${to}-${from}`;
  return PLANET_DISTANCES[key1] || PLANET_DISTANCES[key2] || { min: 0, max: 0 };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TravelCalculator() {
  const [fromPlanet, setFromPlanet] = useState<PlanetId>("earth");
  const [toPlanet, setToPlanet] = useState<PlanetId>("mars");
  const [transportId, setTransportId] = useState("voyager");
  const [, tick] = useState(0);

  const simulatedTime = useSimulationClock((s) => s.simulatedTime);

  // Re-tick every second to animate distance changes
  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const transport = useMemo(
    () => TRANSPORT_METHODS.find((t) => t.id === transportId)!,
    [transportId]
  );

  // Compute current distance using real orbital positions
  const calculations = useMemo(() => {
    if (fromPlanet === toPlanet) return null;

    const fromData = PLANETS.find((p) => p.id === fromPlanet)!;
    const toData = PLANETS.find((p) => p.id === toPlanet)!;

    const fromPos = computePlanetPosition(fromData, simulatedTime);
    const toPos = computePlanetPosition(toData, simulatedTime);

    // Current distance in AU
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const currentDistanceAU = Math.sqrt(dx * dx + dy * dy);
    const currentDistanceKm = currentDistanceAU * AU_KM;

    // Min/Max from NASA data
    const { min: minAU, max: maxAU } = getMinMaxDistance(fromPlanet, toPlanet);
    const minKm = minAU * AU_KM;
    const maxKm = maxAU * AU_KM;

    // Travel time at chosen speed
    const travelTimeSeconds = currentDistanceKm / transport.speed;
    const signalDelaySeconds = currentDistanceKm / LIGHT_SPEED;
    const lightTravelSeconds = currentDistanceKm / LIGHT_SPEED;

    // Relative velocity (simplified — difference in orbital velocities)
    const fromVelocity = (2 * Math.PI * fromData.orbitRadius * AU_KM) / (fromData.period * 86400);
    const toVelocity = (2 * Math.PI * toData.orbitRadius * AU_KM) / (toData.period * 86400);
    const relativeVelocity = Math.abs(fromVelocity - toVelocity);

    return {
      currentDistanceAU,
      currentDistanceKm,
      minAU,
      maxAU,
      minKm,
      maxKm,
      travelTimeSeconds,
      signalDelaySeconds,
      lightTravelSeconds,
      relativeVelocity,
    };
  }, [fromPlanet, toPlanet, transport, simulatedTime]);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <Rocket className="h-4 w-4 text-cosmic-400" />
        <h3 className="text-xs font-semibold text-star-white">Travel Calculator</h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Planet Selection */}
        <div className="flex items-center gap-2">
          <PlanetSelect value={fromPlanet} onChange={setFromPlanet} label="From" />
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
          <PlanetSelect value={toPlanet} onChange={setToPlanet} label="To" />
        </div>

        {/* Transport Method */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/30">Transport</label>
          <select
            value={transportId}
            onChange={(e) => setTransportId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-space-800 px-3 py-1.5 text-xs text-white/80 focus:border-cosmic-500/50 focus:outline-none"
          >
            {TRANSPORT_METHODS.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.speed.toLocaleString()} km/s</option>
            ))}
          </select>
        </div>

        {/* Same planet warning */}
        {fromPlanet === toPlanet && (
          <p className="text-center text-[10px] text-amber-400/60">Select two different planets</p>
        )}

        {/* Results */}
        {calculations && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            {/* Current Distance */}
            <ResultRow
              icon={<Ruler className="h-3 w-3" />}
              label="Current Distance"
              value={formatDistance(calculations.currentDistanceKm)}
              sub={`${calculations.currentDistanceAU.toFixed(3)} AU`}
              highlight
            />

            {/* Min / Max */}
            <div className="flex gap-2">
              <ResultRow
                label="Minimum"
                value={`${calculations.minAU.toFixed(2)} AU`}
                sub={formatDistance(calculations.minKm)}
                compact
              />
              <ResultRow
                label="Maximum"
                value={`${calculations.maxAU.toFixed(2)} AU`}
                sub={formatDistance(calculations.maxKm)}
                compact
              />
            </div>

            {/* Travel Time */}
            <ResultRow
              icon={<Clock className="h-3 w-3" />}
              label={`Travel Time (${transport.name})`}
              value={formatTime(calculations.travelTimeSeconds)}
            />

            {/* Signal Delay */}
            <ResultRow
              icon={<Radio className="h-3 w-3" />}
              label="Signal Delay"
              value={formatTime(calculations.signalDelaySeconds)}
              sub="One-way light time"
            />

            {/* Relative Velocity */}
            <ResultRow
              icon={<Gauge className="h-3 w-3" />}
              label="Relative Orbital Velocity"
              value={`${calculations.relativeVelocity.toFixed(1)} km/s`}
            />

            {/* Distance bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] text-white/30">
                <span>Min</span>
                <span>Current Position</span>
                <span>Max</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cosmic-500 to-nebula-400 transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, ((calculations.currentDistanceAU - calculations.minAU) / (calculations.maxAU - calculations.minAU)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlanetSelect({
  value,
  onChange,
  label,
}: {
  value: PlanetId;
  onChange: (id: PlanetId) => void;
  label: string;
}) {
  return (
    <div className="flex-1">
      <label className="text-[9px] uppercase tracking-wider text-white/30">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PlanetId)}
        className="mt-0.5 w-full rounded-lg border border-white/10 bg-space-800 px-2 py-1.5 text-xs text-white/80 focus:border-cosmic-500/50 focus:outline-none"
      >
        {PLANETS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({
  icon,
  label,
  value,
  sub,
  highlight,
  compact,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex-1 rounded-md bg-white/[0.02] px-2 py-1.5 ring-1 ring-white/5">
        <p className="text-[9px] text-white/30">{label}</p>
        <p className="mt-0.5 font-mono text-[10px] text-white/70">{value}</p>
        {sub && <p className="text-[9px] text-white/30">{sub}</p>}
      </div>
    );
  }

  return (
    <div className={cn("rounded-md px-2.5 py-1.5", highlight && "bg-cosmic-500/5 ring-1 ring-cosmic-500/10")}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-cosmic-400">{icon}</span>}
        <span className="text-[10px] text-white/40">{label}</span>
      </div>
      <p className={cn("mt-0.5 font-mono text-xs", highlight ? "text-cosmic-200" : "text-white/80")}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-white/30">{sub}</p>}
    </div>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDistance(km: number): string {
  if (km >= 1e9) return `${(km / 1e9).toFixed(2)} billion km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(1)} million km`;
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 86400 * 365.25) {
    const days = seconds / 86400;
    if (days < 30) return `${days.toFixed(1)} days`;
    if (days < 365) return `${(days / 30.44).toFixed(1)} months`;
    return `${(days / 365.25).toFixed(1)} years`;
  }
  const years = seconds / (86400 * 365.25);
  if (years >= 1000) return `${(years / 1000).toFixed(1)} thousand years`;
  return `${years.toFixed(1)} years`;
}
