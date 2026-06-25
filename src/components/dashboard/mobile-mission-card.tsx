"use client";

import { useState, useRef, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronUp,
  ChevronDown,
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

// ─── Fine-grained selectors (same pattern as satellite-detail-panel) ──────────

const selectHasSatellite  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite !== null;

const selectNoradId    = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.noradId;
const selectName       = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.name;
const selectCategory   = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.category;
const selectVelocity   = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.velocity;
const selectAltitude   = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.altitude;
const selectLatitude   = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.latitude;
const selectLongitude  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.longitude;
const selectInclination = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.inclination;
const selectPeriod     = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.period;
const selectOrbitType  = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.orbitType;
const selectLaunchYear = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.launchYear;
const selectLastUpdated = (s: ReturnType<typeof useSatelliteStore.getState>) => s.selectedSatellite?.lastUpdated;
const selectSetSatellite = (s: ReturnType<typeof useSatelliteStore.getState>) => s.setSelectedSatellite;

// ─── Root component ───────────────────────────────────────────────────────────
// Only subscribes to a boolean — mounts/unmounts the card.

export const MobileMissionCard = memo(function MobileMissionCard() {
  const hasSatellite = useSatelliteStore(selectHasSatellite);
  const [expanded, setExpanded] = useState(false);

  const touchStartYRef = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]!.clientY;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaY = e.changedTouches[0]!.clientY - touchStartYRef.current;
      if (deltaY > 50 && expanded) setExpanded(false);
    },
    [expanded]
  );

  return (
    <AnimatePresence>
      {hasSatellite && (
        <motion.div
          key="mission-card"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute inset-x-3 z-30"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          {expanded ? (
            <ExpandedCard
              onCollapse={() => setExpanded(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />
          ) : (
            <CollapsedPill onExpand={() => setExpanded(true)} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ─── Collapsed pill ───────────────────────────────────────────────────────────
// Static fields (name, category color) + live altitude/velocity rows each as
// isolated memo children so only the changed value re-renders.

const CollapsedPill = memo(function CollapsedPill({ onExpand }: { onExpand: () => void }) {
  const name     = useSatelliteStore(selectName);
  const category = useSatelliteStore(selectCategory);
  const setSelectedSatellite = useSatelliteStore(selectSetSatellite);

  if (!name || !category) return null;
  const meta = getCategoryMeta(category);

  return (
    <div className="flex h-[56px] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/95 px-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color, boxShadow: `0 0 6px 1px ${meta.color}80` }}
      />
      <span className="flex-1 truncate text-sm font-bold text-[#FAFAF8]">{name}</span>
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#00C16A]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00C16A]" />
        LIVE
      </span>
      <PillAltitude />
      <PillVelocity />
      <button
        onClick={onExpand}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-[#A8A9AD] transition-colors hover:text-[#FAFAF8]"
        aria-label="Expand satellite details"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        onClick={() => setSelectedSatellite(null)}
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-[#75777D] transition-colors hover:text-[#FAFAF8]"
        aria-label="Dismiss satellite card"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

const PillAltitude = memo(function PillAltitude() {
  const altitude = useSatelliteStore(selectAltitude);
  if (altitude === undefined) return null;
  return (
    <span className="hidden shrink-0 text-[11px] font-medium text-[#75777D] xs:inline">
      {altitude.toFixed(0)} km
    </span>
  );
});

const PillVelocity = memo(function PillVelocity() {
  const velocity = useSatelliteStore(selectVelocity);
  if (velocity === undefined) return null;
  return (
    <span className="hidden shrink-0 text-[11px] font-medium text-[#75777D] sm:inline">
      {velocity.toFixed(2)} km/s
    </span>
  );
});

// ─── Expanded card ────────────────────────────────────────────────────────────

const ExpandedCard = memo(function ExpandedCard({
  onCollapse,
  onTouchStart,
  onTouchEnd,
}: {
  onCollapse: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}) {
  const noradId  = useSatelliteStore(selectNoradId);
  const name     = useSatelliteStore(selectName);
  const category = useSatelliteStore(selectCategory);
  const setSelectedSatellite = useSatelliteStore(selectSetSatellite);

  // useCallback MUST be called before any early return (Rules of Hooks)
  const handleClose = useCallback(() => {
    onCollapse();
    setSelectedSatellite(null);
  }, [onCollapse, setSelectedSatellite]);

  if (!noradId || !name || !category) return null;

  const meta    = getCategoryMeta(category);
  const satMeta = getSatelliteMetadata(noradId, name, category);

  return (
    <motion.div
      initial={{ opacity: 0.8, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <button
        className="flex w-full items-center justify-center pb-1 pt-2.5"
        onClick={onCollapse}
        aria-label="Collapse panel"
      >
        <div className="h-1 w-10 rounded-full bg-[rgba(255,255,255,0.15)]" />
      </button>

      {/* Header — static */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: meta.color + "22" }}
        >
          <Satellite className="h-4 w-4" style={{ color: meta.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[#FAFAF8]">{name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: meta.color + "22", color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#00C16A]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00C16A]" />
              LIVE
            </span>
          </div>
        </div>
        <button
          onClick={onCollapse}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-[#75777D] transition-colors hover:text-[#FAFAF8]"
          aria-label="Collapse"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={handleClose}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-[#75777D] transition-colors hover:text-[#FAFAF8]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable telemetry */}
      <div
        className="overflow-y-auto px-4 pb-4"
        style={{ maxHeight: "calc(50vh - 96px)" }}
      >
        <div className="space-y-1.5">
          {/* Static rows */}
          <TelemetryRow icon={<Tag className="h-3 w-3" />}      label="NORAD ID" value={String(noradId)} />
          <TelemetryRow icon={<Flag className="h-3 w-3" />}     label="Country"  value={satMeta.country} />
          <TelemetryRow icon={<Building className="h-3 w-3" />} label="Operator" value={satMeta.operator} />
          {/* Live telemetry rows — isolated components */}
          <CardSpeedRow />
          <CardAltitudeRow />
          <CardInclinationRow />
          <CardLatitudeRow />
          <CardLongitudeRow />
          <CardPeriodRow />
          <CardOrbitTypeRow />
          <CardLaunchYearRow />
          <CardLastUpdatedRow />
        </div>
      </div>
    </motion.div>
  );
});

// ─── Isolated live rows for the expanded card ─────────────────────────────────

const CardSpeedRow = memo(function CardSpeedRow() {
  const velocity = useSatelliteStore(selectVelocity);
  if (velocity === undefined) return null;
  const speedKmH = velocity * 3600;
  const speedMph = speedKmH * 0.621371;
  return (
    <TelemetryRow
      icon={<Gauge className="h-3 w-3" />}
      label="Speed"
      value={`${velocity.toFixed(2)} km/s`}
      subValue={`${speedKmH.toFixed(0)} km/h · ${speedMph.toFixed(0)} mph`}
    />
  );
});

const CardAltitudeRow = memo(function CardAltitudeRow() {
  const v = useSatelliteStore(selectAltitude);
  if (v === undefined) return null;
  return <TelemetryRow icon={<Mountain className="h-3 w-3" />} label="Altitude" value={`${v.toFixed(1)} km`} />;
});

const CardInclinationRow = memo(function CardInclinationRow() {
  const v = useSatelliteStore(selectInclination);
  if (v === undefined) return null;
  return <TelemetryRow icon={<Orbit className="h-3 w-3" />} label="Inclination" value={`${v.toFixed(2)}°`} />;
});

const CardLatitudeRow = memo(function CardLatitudeRow() {
  const v = useSatelliteStore(selectLatitude);
  if (v === undefined) return null;
  return <TelemetryRow icon={<Globe2 className="h-3 w-3" />} label="Latitude" value={`${v.toFixed(4)}°`} />;
});

const CardLongitudeRow = memo(function CardLongitudeRow() {
  const v = useSatelliteStore(selectLongitude);
  if (v === undefined) return null;
  return <TelemetryRow icon={<Globe2 className="h-3 w-3" />} label="Longitude" value={`${v.toFixed(4)}°`} />;
});

const CardPeriodRow = memo(function CardPeriodRow() {
  const v = useSatelliteStore(selectPeriod);
  if (v === undefined) return null;
  return <TelemetryRow icon={<Clock className="h-3 w-3" />} label="Orbit Period" value={`${v.toFixed(1)} min`} />;
});

const CardOrbitTypeRow = memo(function CardOrbitTypeRow() {
  const v = useSatelliteStore(selectOrbitType);
  if (!v) return null;
  return <TelemetryRow icon={<Orbit className="h-3 w-3" />} label="Orbit Type" value={v} />;
});

const CardLaunchYearRow = memo(function CardLaunchYearRow() {
  const v = useSatelliteStore(selectLaunchYear);
  if (!v) return null;
  return <TelemetryRow icon={<Calendar className="h-3 w-3" />} label="Launch Year" value={String(v)} />;
});

const CardLastUpdatedRow = memo(function CardLastUpdatedRow() {
  const v = useSatelliteStore(selectLastUpdated);
  if (!v) return null;
  return <TelemetryRow icon={<Activity className="h-3 w-3" />} label="Last Updated" value={new Date(v).toLocaleTimeString()} />;
});

// ─── Shared presenter ─────────────────────────────────────────────────────────

function TelemetryRow({
  icon, label, value, subValue,
}: {
  icon: React.ReactNode; label: string; value: string; subValue?: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2.5 border border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 text-[#75777D]">
        <span className="text-[#A8A9AD]">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-right">
        <span className="font-mono text-xs font-medium text-[#FAFAF8]">{value}</span>
        {subValue && <p className="mt-0.5 text-[10px] text-[#75777D]">{subValue}</p>}
      </div>
    </div>
  );
}
