"use client";

import {
  X,
  Satellite,
  Gauge,
  Mountain,
  Globe2,
  Clock,
  Orbit,
  Tag,
  Calendar,
  Activity,
  Flag,
  Building,
} from "lucide-react";
import { useSatelliteStore } from "@/stores/satellite-store";
import { getCategoryMeta } from "@/services/tle-service";
import { getSatelliteMetadata } from "@/services/satellite-metadata";

// ─── Component ───────────────────────────────────────────────────────────────

export function SatelliteDetailPanel() {
  const { selectedSatellite, setSelectedSatellite } = useSatelliteStore();

  if (!selectedSatellite) return null;

  const meta = getCategoryMeta(selectedSatellite.category);
  const satMeta = getSatelliteMetadata(
    selectedSatellite.noradId,
    selectedSatellite.name,
    selectedSatellite.category
  );

  const speedKmH = selectedSatellite.velocity * 3600;
  const speedMph = speedKmH * 0.621371;

  return (
    <div className="animate-in slide-in-from-right-4 rounded-xl border border-border-subtle bg-surface-secondary p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: meta.color + "20" }}
          >
            <Satellite className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-star-white">
              {selectedSatellite.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: meta.color + "20",
                  color: meta.color,
                }}
              >
                {meta.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                Live
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setSelectedSatellite(null)}
          className="rounded-md p-1 text-star-white/40 hover:bg-surface-glass hover:text-star-white"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Data Grid */}
      <div className="mt-4 space-y-2.5">
        <DetailRow
          icon={<Tag className="h-3 w-3" />}
          label="NORAD ID"
          value={String(selectedSatellite.noradId)}
        />
        <DetailRow
          icon={<Flag className="h-3 w-3" />}
          label="Country"
          value={satMeta.country}
        />
        <DetailRow
          icon={<Building className="h-3 w-3" />}
          label="Operator"
          value={satMeta.operator}
        />
        <DetailRow
          icon={<Gauge className="h-3 w-3" />}
          label="Speed"
          value={`${selectedSatellite.velocity.toFixed(2)} km/s`}
          subValue={`${speedKmH.toFixed(0)} km/h · ${speedMph.toFixed(0)} mph`}
        />
        <DetailRow
          icon={<Mountain className="h-3 w-3" />}
          label="Altitude"
          value={`${selectedSatellite.altitude.toFixed(1)} km`}
        />
        {selectedSatellite.inclination !== undefined && (
          <DetailRow
            icon={<Orbit className="h-3 w-3" />}
            label="Inclination"
            value={`${selectedSatellite.inclination.toFixed(2)}°`}
          />
        )}
        <DetailRow
          icon={<Globe2 className="h-3 w-3" />}
          label="Latitude"
          value={`${selectedSatellite.latitude.toFixed(4)}°`}
        />
        <DetailRow
          icon={<Globe2 className="h-3 w-3" />}
          label="Longitude"
          value={`${selectedSatellite.longitude.toFixed(4)}°`}
        />
        {selectedSatellite.period !== undefined && (
          <DetailRow
            icon={<Clock className="h-3 w-3" />}
            label="Orbit Period"
            value={`${selectedSatellite.period.toFixed(1)} min`}
          />
        )}
        {selectedSatellite.orbitType && (
          <DetailRow
            icon={<Orbit className="h-3 w-3" />}
            label="Orbit Type"
            value={selectedSatellite.orbitType}
          />
        )}
        {selectedSatellite.launchYear && (
          <DetailRow
            icon={<Calendar className="h-3 w-3" />}
            label="Launch Year"
            value={String(selectedSatellite.launchYear)}
          />
        )}
        {selectedSatellite.lastUpdated && (
          <DetailRow
            icon={<Activity className="h-3 w-3" />}
            label="Last Updated"
            value={new Date(selectedSatellite.lastUpdated).toLocaleTimeString()}
          />
        )}
      </div>
    </div>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex items-start justify-between text-xs">
      <div className="flex items-center gap-1.5 text-star-white/50">
        <span className="text-cosmic-400">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className="font-mono text-star-white/80">{value}</span>
        {subValue && (
          <p className="mt-0.5 text-xs text-star-white/30">{subValue}</p>
        )}
      </div>
    </div>
  );
}
