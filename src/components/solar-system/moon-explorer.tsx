"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSolarSystemStore, PLANETS } from "@/stores/solar-system-store";
import { getMoonsForPlanet, type MoonInfo } from "@/services/moon-data";

/**
 * Moon Explorer — shows when a planet is selected in Solar System view.
 * Displays natural satellites with collapsible detail cards.
 */
export function MoonExplorer() {
  const selectedPlanet = useSolarSystemStore((s) => s.selectedPlanet);

  const planet = useMemo(
    () => (selectedPlanet ? PLANETS.find((p) => p.id === selectedPlanet) : null),
    [selectedPlanet]
  );

  const moons = useMemo(
    () => (selectedPlanet ? getMoonsForPlanet(selectedPlanet) : []),
    [selectedPlanet]
  );

  if (!planet || moons.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: planet.color }} />
        <h3 className="text-sm font-semibold text-star-white">
          {planet.name}&apos;s Moons
        </h3>
        <span className="ml-auto rounded-full bg-surface-glass px-2 py-0.5 text-[10px] text-star-white/50">
          {moons.length}
        </span>
      </div>

      {/* Moon List */}
      <div className="mt-3 space-y-1.5">
        {moons.map((moon) => (
          <MoonCard key={moon.id} moon={moon} planetColor={planet.color} />
        ))}
      </div>
    </div>
  );
}

// ─── Moon Card ───────────────────────────────────────────────────────────────

function MoonCard({ moon, planetColor }: { moon: MoonInfo; planetColor: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        expanded
          ? "border-border-glow bg-surface-primary"
          : "border-transparent hover:border-border-subtle hover:bg-surface-primary/50"
      )}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
        aria-expanded={expanded}
        aria-label={`${moon.name} details`}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-star-white/40" />
        ) : (
          <ChevronRight className="h-3 w-3 text-star-white/40" />
        )}
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: planetColor, opacity: 0.7 }}
        />
        <span className="flex-1 text-xs font-medium text-star-white/80">{moon.name}</span>
        <span className="text-[10px] text-star-white/30">
          {moon.radius > 100 ? `${moon.radius.toFixed(0)} km` : `${moon.radius.toFixed(1)} km`}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border-subtle px-3 pb-3 pt-2">
          {/* Image */}
          <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-space-900">
            <Image
              src={moon.imageUrl}
              alt={moon.name}
              fill
              className="object-cover"
              sizes="240px"
              unoptimized
            />
          </div>

          {/* Data Grid */}
          <div className="space-y-1.5 text-[11px]">
            <DataRow label="Radius" value={`${moon.radius.toLocaleString()} km`} />
            <DataRow label="Diameter" value={`${(moon.radius * 2).toLocaleString()} km`} />
            <DataRow label="Mass" value={`${moon.mass} × 10²⁰ kg`} />
            <DataRow label="Gravity" value={`${moon.gravity} m/s²`} />
            <DataRow label="Orbital Period" value={`${moon.orbitalPeriod} days`} />
            <DataRow label="Distance" value={`${moon.distanceFromPlanet.toLocaleString()} km`} />
            <DataRow label="Eccentricity" value={moon.eccentricity.toFixed(4)} />
            <DataRow label="Inclination" value={`${moon.inclination}°`} />
            <DataRow
              label="Discovery"
              value={moon.discoveryYear ? `${moon.discoveryYear} — ${moon.discoveredBy}` : moon.discoveredBy}
            />
          </div>

          {/* Fact */}
          <div className="mt-3 rounded-md bg-cosmic-500/5 px-2.5 py-2 ring-1 ring-cosmic-500/10">
            <p className="text-[10px] leading-relaxed text-cosmic-200/70">
              💡 {moon.fact}
            </p>
          </div>

          {/* NASA Link */}
          <a
            href={`https://science.nasa.gov/solar-system/moons/${moon.id}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-[10px] text-cosmic-400/60 hover:text-cosmic-300"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            NASA Fact Sheet
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-star-white/60">
      <span>{label}</span>
      <span className="font-mono text-star-white/80">{value}</span>
    </div>
  );
}
