"use client";

import { memo } from "react";
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
import { useISSTracker } from "@/hooks/use-iss-tracker";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ISSDetailPanelProps {
  nextPass: SatellitePass | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ISSDetailPanel = memo(function ISSDetailPanel({ nextPass }: ISSDetailPanelProps) {
  // Pull ISS data here, not in the parent DetailsPanel.
  // This isolates the 60fps re-renders to only this memoized component.
  const { issData } = useISSTracker();
  if (!issData) return null;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-secondary p-4">
      {/* Header */}
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

      {/* Speed Section */}
      <div className="mt-4 rounded-lg bg-surface-primary/50 p-3">
        <div className="flex items-center gap-1.5 text-xs text-star-white/50">
          <Gauge className="h-3 w-3 text-cosmic-400" />
          <span>Speed</span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          <SpeedUnit value={issData.speedKmS.toFixed(2)} unit="km/s" />
          <SpeedUnit value={issData.speedKmH.toFixed(0)} unit="km/h" />
          <SpeedUnit value={issData.speedMph.toFixed(0)} unit="mph" />
        </div>
      </div>

      {/* Position Data */}
      <div className="mt-3 space-y-2">
        <DataRow
          icon={<Mountain className="h-3 w-3" />}
          label="Altitude"
          value={`${issData.altitude.toFixed(1)} km`}
        />
        <DataRow
          icon={<Globe2 className="h-3 w-3" />}
          label="Latitude"
          value={`${issData.latitude.toFixed(4)}°`}
        />
        <DataRow
          icon={<Globe2 className="h-3 w-3" />}
          label="Longitude"
          value={`${issData.longitude.toFixed(4)}°`}
        />
      </div>

      {/* Next Pass Section */}
      {nextPass && (
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
      )}

      {!nextPass && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-primary/50 p-3 text-center">
          <p className="text-xs text-star-white/30">
            Select a location to see next ISS pass prediction
          </p>
        </div>
      )}
    </div>
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
