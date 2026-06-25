"use client";

import { memo, useSyncExternalStore } from "react";
import {
  Radio,
  Gauge,
  Mountain,
  Globe2,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";
import type { SatellitePass } from "@/types";

// ─── External store selectors ─────────────────────────────────────────────────
//
// We import the module-level store primitives directly from use-iss-tracker
// instead of calling useISSTracker() (which returns a new issData object every
// 60fps frame, defeating React.memo). This way each row subscribes to exactly
// one primitive value and only re-renders when THAT value changes.

import {
  subscribeISSAnim,
  getISSAnimSnapshot,
  getISSAnimServerSnapshot,
  subscribeISSNextPass,
  getISSNextPassSnapshot,
  getISSNextPassServerSnapshot,
} from "@/hooks/use-iss-tracker";

// ─── Types ───────────────────────────────────────────────────────────────────

// Kept for backward compat — mobile-info-sidebar still passes it.
// When omitted the component reads nextPass from its own subscription.
interface ISSDetailPanelProps {
  nextPass?: SatellitePass | null;
}

// ─── Shell ────────────────────────────────────────────────────────────────────
// Only mounts the card when ISS data is available.
// Subscribes to a single boolean to avoid 60fps renders on the shell itself.

export const ISSDetailPanel = memo(function ISSDetailPanel({
  nextPass: nextPassProp,
}: ISSDetailPanelProps) {
  const animState = useSyncExternalStore(
    subscribeISSAnim,
    getISSAnimSnapshot,
    getISSAnimServerSnapshot
  );
  if (!animState) return null;
  return <ISSCardInner nextPassProp={nextPassProp ?? undefined} />;
});

// ─── Card ─────────────────────────────────────────────────────────────────────

const ISSCardInner = memo(function ISSCardInner({
  nextPassProp,
}: {
  nextPassProp?: SatellitePass | null;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary p-4">
      {/* Header — static, never re-renders */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)]">
          <Radio className="h-4 w-4 text-[#A8A9AD]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-star-white">
            International Space Station
          </h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-xs text-[#A8A9AD]">
              NORAD 25544
            </span>
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Speed — isolated rows, each subscribes to one field */}
      <div className="mt-4 rounded-lg bg-surface-primary/50 p-3">
        <div className="flex items-center gap-1.5 text-xs text-star-white/50">
          <Gauge className="h-3 w-3 text-cosmic-400" />
          <span>Speed</span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          <ISSSpeedKmS />
          <ISSSpeedKmH />
          <ISSSpeedMph />
        </div>
      </div>

      {/* Position */}
      <div className="mt-3 space-y-2">
        <ISSAltitude />
        <ISSLatitude />
        <ISSLongitude />
      </div>

      {/* Next Pass */}
      <ISSNextPass nextPassProp={nextPassProp} />
    </div>
  );
});

// ─── Individual live field components ────────────────────────────────────────
// Each component subscribes to the external store and reads exactly one field.
// React.memo ensures the component only re-renders when that field changes.

const ISSSpeedKmS = memo(function ISSSpeedKmS() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return <SpeedUnit value={s.speedKmS.toFixed(2)} unit="km/s" />;
});

const ISSSpeedKmH = memo(function ISSSpeedKmH() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return <SpeedUnit value={s.speedKmH.toFixed(0)} unit="km/h" />;
});

const ISSSpeedMph = memo(function ISSSpeedMph() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return <SpeedUnit value={s.speedMph.toFixed(0)} unit="mph" />;
});

const ISSAltitude = memo(function ISSAltitude() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return (
    <DataRow
      icon={<Mountain className="h-3 w-3" />}
      label="Altitude"
      value={`${s.altitude.toFixed(1)} km`}
    />
  );
});

const ISSLatitude = memo(function ISSLatitude() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return (
    <DataRow
      icon={<Globe2 className="h-3 w-3" />}
      label="Latitude"
      value={`${s.latitude.toFixed(4)}°`}
    />
  );
});

const ISSLongitude = memo(function ISSLongitude() {
  const s = useSyncExternalStore(subscribeISSAnim, getISSAnimSnapshot, getISSAnimServerSnapshot);
  if (!s) return null;
  return (
    <DataRow
      icon={<Globe2 className="h-3 w-3" />}
      label="Longitude"
      value={`${s.longitude.toFixed(4)}°`}
    />
  );
});

// ─── Next Pass ────────────────────────────────────────────────────────────────
// Subscribes to nextPass external store (updates at most every 5 min).

const ISSNextPass = memo(function ISSNextPass({
  nextPassProp,
}: {
  nextPassProp?: SatellitePass | null;
}) {
  // Use the passed prop when available (mobile sidebar passes it from its own
  // useISSTracker call). Otherwise subscribe to the module-level nextPass store.
  const storeNextPass = useSyncExternalStore(
    subscribeISSNextPass,
    getISSNextPassSnapshot,
    getISSNextPassServerSnapshot
  );
  const nextPass = nextPassProp !== undefined ? nextPassProp : storeNextPass;

  if (!nextPass) {
    return (
      <div className="mt-4 rounded-lg border border-border-subtle bg-surface-primary/50 p-3 text-center">
        <p className="text-xs text-star-white/30">
          Select a location to see next ISS pass prediction
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-cosmic-500/20 bg-cosmic-500/5 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-cosmic-300">
        <Clock className="h-3 w-3" />
        <span>Next Pass</span>
      </div>
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-star-white/50">
            <ArrowUp className="h-2.5 w-2.5 text-green-400" />
            Start
          </span>
          <span className="font-mono text-star-white/80">
            {formatPassTime(nextPass.startTime)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-star-white/50">
            <Activity className="h-2.5 w-2.5 text-cosmic-400" />
            Max Elevation
          </span>
          <span className="font-mono text-star-white/80">
            {nextPass.maxElevation.toFixed(1)}°
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-star-white/50">
            <ArrowDown className="h-2.5 w-2.5 text-red-400" />
            End
          </span>
          <span className="font-mono text-star-white/80">
            {formatPassTime(nextPass.endTime)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-star-white/50">Duration</span>
          <span className="font-mono text-star-white/80">
            {formatDuration(nextPass.duration)}
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── Presenters ───────────────────────────────────────────────────────────────

function SpeedUnit({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-sm font-semibold text-star-white">{value}</p>
      <p className="text-xs text-star-white/40">{unit}</p>
    </div>
  );
}

function DataRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-star-white/50">
        <span className="text-cosmic-400">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="font-mono text-star-white/80">{value}</span>
    </div>
  );
}

function formatPassTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
