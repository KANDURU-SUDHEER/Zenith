"use client";

import { memo, useCallback } from "react";
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

// ─── Fine-grained selectors ───────────────────────────────────────────────────
//
// The key insight: subscribing to the full `selectedSatellite` object means
// every propagation tick (which replaces the object reference) triggers a
// re-render, even when the visual values haven't meaningfully changed.
//
// Solution: use individual field selectors so React.memo can bail out when
// only sub-second floating-point changes occur. The static fields (noradId,
// name, category, inclination, period, orbitType, launchYear) are extracted
// by a selector that returns a stable primitive tuple — they only change when
// a NEW satellite is selected.
//
// Live fields (velocity, altitude, latitude, longitude, lastUpdated) are each
// read by a separate selector so only the changed field re-renders its row.

// Static identity fields — changes only on NEW satellite selection
const selectStaticId = (s: ReturnType<typeof useSatelliteStore.getState>) =>
  s.selectedSatellite
    ? `${s.selectedSatellite.noradId}|${s.selectedSatellite.name}|${s.selectedSatellite.category}`
    : null;

// Live telemetry fields — each is a primitive, React bails out if unchanged
const selectNoradId   = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.noradId;
const selectName      = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.name;
const selectCategory  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.category;
const selectVelocity  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.velocity;
const selectAltitude  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.altitude;
const selectLatitude  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.latitude;
const selectLongitude = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.longitude;
const selectInclination = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.inclination;
const selectPeriod    = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.period;
const selectOrbitType = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.orbitType;
const selectLaunchYear = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.launchYear;
const selectLastUpdated = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.lastUpdated;
const selectSetSatellite = (s: ReturnType<typeof useSatelliteStore.getState>) => s.setSelectedSatellite;

// ─── Shell ─────────────────────────────────────────────────────────────────────
// SatelliteDetailPanel renders nothing when no satellite is selected.
// When a satellite IS selected it renders a stable shell + live telemetry rows.
// The shell itself (header, card border, static metadata) only re-renders when
// the satellite identity changes (noradId / name / category).

export const SatelliteDetailPanel = memo(function SatelliteDetailPanel() {
  const staticId = useSatelliteStore(selectStaticId);

  // Nothing selected → render nothing, no subscription cost
  if (!staticId) return null;

  return <SatelliteCardInner />;
});

// ─── Inner card — only remounts on identity change ────────────────────────────
// This is memo-wrapped separately so the live telemetry rows render inside a
// stable parent. The card border/header never flicker.

const SatelliteCardInner = memo(function SatelliteCardInner() {
  const noradId   = useSatelliteStore(selectNoradId)!;
  const name      = useSatelliteStore(selectName)!;
  const category  = useSatelliteStore(selectCategory)!;
  const inclination = useSatelliteStore(selectInclination);
  const period    = useSatelliteStore(selectPeriod);
  const orbitType = useSatelliteStore(selectOrbitType);
  const launchYear = useSatelliteStore(selectLaunchYear);
  const setSelectedSatellite = useSatelliteStore(selectSetSatellite);

  const meta    = getCategoryMeta(category);
  const satMeta = getSatelliteMetadata(noradId, name, category);

  const handleClose = useCallback(
    () => setSelectedSatellite(null),
    [setSelectedSatellite]
  );

  return (
    // Remove animate-in class — it ran on every re-render, causing visible flicker
    <div className="rounded-xl border border-border-subtle bg-surface-secondary p-4">
      {/* ── Header (static — never re-renders after initial mount) ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: meta.color + "20" }}
          >
            <Satellite className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-star-white">{name}</h3>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-1.5 py-0.5 text-xs"
                style={{ backgroundColor: meta.color + "20", color: meta.color }}
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
          onClick={handleClose}
          className="rounded-md p-1 text-star-white/40 hover:bg-surface-glass hover:text-star-white"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Static metadata rows ── */}
      <div className="mt-4 space-y-2.5">
        <StaticRow icon={<Tag className="h-3 w-3" />}      label="NORAD ID"  value={String(noradId)} />
        <StaticRow icon={<Flag className="h-3 w-3" />}     label="Country"   value={satMeta.country} />
        <StaticRow icon={<Building className="h-3 w-3" />} label="Operator"  value={satMeta.operator} />

        {/* ── Live telemetry rows — each is its own isolated component ── */}
        <SpeedRow />
        <AltitudeRow />
        {inclination !== undefined && (
          <StaticRow
            icon={<Orbit className="h-3 w-3" />}
            label="Inclination"
            value={`${inclination.toFixed(2)}°`}
          />
        )}
        <LatitudeRow />
        <LongitudeRow />
        {period !== undefined && (
          <StaticRow
            icon={<Clock className="h-3 w-3" />}
            label="Orbit Period"
            value={`${period.toFixed(1)} min`}
          />
        )}
        {orbitType && (
          <StaticRow
            icon={<Orbit className="h-3 w-3" />}
            label="Orbit Type"
            value={orbitType}
          />
        )}
        {launchYear && (
          <StaticRow
            icon={<Calendar className="h-3 w-3" />}
            label="Launch Year"
            value={String(launchYear)}
          />
        )}
        <LastUpdatedRow />
      </div>
    </div>
  );
});

// ─── Live telemetry rows ──────────────────────────────────────────────────────
// Each row subscribes to exactly one field. When the propagation loop updates
// the satellite object, only the row(s) whose field value actually changed will
// re-render. The parent card shell stays completely stable.

const SpeedRow = memo(function SpeedRow() {
  const velocity = useSatelliteStore(selectVelocity);
  if (velocity === undefined) return null;
  const speedKmH = velocity * 3600;
  const speedMph = speedKmH * 0.621371;
  return (
    <DetailRow
      icon={<Gauge className="h-3 w-3" />}
      label="Speed"
      value={`${velocity.toFixed(2)} km/s`}
      subValue={`${speedKmH.toFixed(0)} km/h · ${speedMph.toFixed(0)} mph`}
    />
  );
});

const AltitudeRow = memo(function AltitudeRow() {
  const altitude = useSatelliteStore(selectAltitude);
  if (altitude === undefined) return null;
  return (
    <DetailRow
      icon={<Mountain className="h-3 w-3" />}
      label="Altitude"
      value={`${altitude.toFixed(1)} km`}
    />
  );
});

const LatitudeRow = memo(function LatitudeRow() {
  const lat = useSatelliteStore(selectLatitude);
  if (lat === undefined) return null;
  return (
    <DetailRow
      icon={<Globe2 className="h-3 w-3" />}
      label="Latitude"
      value={`${lat.toFixed(4)}°`}
    />
  );
});

const LongitudeRow = memo(function LongitudeRow() {
  const lon = useSatelliteStore(selectLongitude);
  if (lon === undefined) return null;
  return (
    <DetailRow
      icon={<Globe2 className="h-3 w-3" />}
      label="Longitude"
      value={`${lon.toFixed(4)}°`}
    />
  );
});

const LastUpdatedRow = memo(function LastUpdatedRow() {
  const lastUpdated = useSatelliteStore(selectLastUpdated);
  if (!lastUpdated) return null;
  return (
    <DetailRow
      icon={<Activity className="h-3 w-3" />}
      label="Last Updated"
      value={new Date(lastUpdated).toLocaleTimeString()}
    />
  );
});

// ─── Static row — never re-renders after mount ────────────────────────────────

const StaticRow = memo(function StaticRow({
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
  return <DetailRow icon={icon} label={label} value={value} subValue={subValue} />;
});

// ─── Shared row presenter ─────────────────────────────────────────────────────

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
