"use client";

import { useCallback, useEffect, useRef, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Navigation,
  Sun,
  Moon,
  Clock,
  Stars,
  Globe2,
  Sparkles,
} from "lucide-react";
import { useLocationStore } from "@/stores/location-store";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import { useConstellations } from "@/hooks/use-constellations";
import { ISSDetailPanel } from "./iss-detail-panel";
import { SatelliteDetailPanel } from "./satellite-detail-panel";
import { MoonExplorer } from "@/components/solar-system/moon-explorer";
import { FavoritesPanel } from "@/components/location/favorites-panel";
import { RecentSearchesPanel } from "@/components/location/recent-searches-panel";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileInfoSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Shell ────────────────────────────────────────────────────────────────────
// Animation-only wrapper. InfoContent is memoized independently so its scroll
// position is never reset by the sidebar open/close animation.

export const MobileInfoSidebar = memo(function MobileInfoSidebar({
  isOpen,
  onClose,
}: MobileInfoSidebarProps) {
  const handleBackdropClick = useCallback(() => onClose(), [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="info-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Sidebar panel */}
          <motion.div
            key="info-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden rounded-r-2xl border-r border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/95 backdrop-blur-xl shadow-[4px_0_40px_rgba(0,0,0,0.6)]"
            style={{ width: "min(85vw, 320px)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Mission Data"
          >
            {/* Header — static, never re-renders */}
            <div className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#111215] px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#75777D]">
                Mission Data
              </h2>
              <button
                onClick={onClose}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-xl text-[#75777D] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
                aria-label="Close Mission Data panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content — scroll position preserved inside InfoContent */}
            <InfoContent />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ─── InfoContent ──────────────────────────────────────────────────────────────
// Memoized with its own scroll-position ref so neither satellite ticks nor
// sidebar animation ever resets the scroll.

const InfoContent = memo(function InfoContent() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Empty dep array: only attach listener and restore position on mount.
  // Never call element.scrollTop inside a render or after re-renders.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollPositionRef.current;
    const onScroll = () => {
      scrollPositionRef.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="space-y-4 p-4">
        {/* Satellite — fine-grained selectors, only changed fields re-render */}
        <SatelliteDetailPanel />

        {/* Solar system moons */}
        <MoonExplorer />

        {/* ISS — self-contained, no prop needed */}
        <ISSDetailPanel />

        {/* Celestial / location data — isolated memoized block */}
        <MobileCelestialContent />

        {/* Favorites */}
        <div className="border-t border-[rgba(255,255,255,0.04)] pt-4">
          <FavoritesPanel />
        </div>

        {/* Recent Searches */}
        <div className="border-t border-[rgba(255,255,255,0.04)] pb-4 pt-4">
          <RecentSearchesPanel maxItems={5} />
        </div>
      </div>
    </div>
  );
});

// ─── MobileCelestialContent ───────────────────────────────────────────────────
// Only re-renders when location or celestial data changes (~30s cadence).
// Completely isolated from satellite-store ticks and ISS 60fps updates.

const MobileCelestialContent = memo(function MobileCelestialContent() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { sun: sunData, moon: moonData, planets: planetsData } = useCelestialEngine();
  const { data: constellations } = useConstellations();

  const visiblePlanets = useMemo(
    () => (selectedLocation ? (planetsData?.filter((p) => p.isVisible) ?? []) : []),
    [selectedLocation, planetsData]
  );
  const visibleConstellations = useMemo(
    () => (selectedLocation ? (constellations?.filter((c) => c.isVisible) ?? []) : []),
    [selectedLocation, constellations]
  );

  if (!selectedLocation) {
    return (
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#75777D]" />
        <p className="text-sm font-bold text-[#FAFAF8]">No location selected</p>
        <p className="mt-1 text-xs leading-relaxed text-[#75777D]">
          Tap on the globe or search to select a location for celestial data.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Location */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
            <Navigation className="h-4 w-4 text-[#A8A9AD]" />
          </div>
          <h3 className="text-sm font-bold text-[#FAFAF8]">Location</h3>
        </div>
        <p className="text-sm font-bold text-[#FAFAF8]">
          {selectedLocation.name || "Selected Point"}
        </p>
        {selectedLocation.country && (
          <p className="mt-1 text-xs text-[#A8A9AD]">{selectedLocation.country}</p>
        )}
        <p className="mt-2 inline-block rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2 py-1 font-mono text-[11px] text-[#75777D]">
          {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
        </p>
        {selectedLocation.timezone && (
          <p className="mt-2 text-xs text-[#75777D]">🕐 {selectedLocation.timezone}</p>
        )}
      </div>

      {/* Sun */}
      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
            <Sun className="h-4 w-4 text-[#A8A9AD]" />
          </div>
          <h3 className="text-sm font-bold text-[#FAFAF8]">Sun</h3>
          {sunData && (
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${
                sunData.isVisible
                  ? "border border-[rgba(0,193,106,0.3)] bg-[rgba(0,193,106,0.2)] text-[#00C16A]"
                  : "border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#75777D]"
              }`}
            >
              {sunData.isVisible ? "Above horizon" : "Below horizon"}
            </span>
          )}
        </div>
        {sunData ? (
          <div className="space-y-2 text-xs text-[#A8A9AD]">
            <div className="flex justify-between">
              <span>Azimuth</span>
              <span className="font-mono text-[#FAFAF8]">{sunData.azimuth.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Elevation</span>
              <span className="font-mono text-[#FAFAF8]">{sunData.elevation.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Rise / Set</span>
              <span className="font-mono text-[#FAFAF8]">
                {sunData.sunrise || "—"} / {sunData.sunset || "—"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#75777D]">Calculating…</p>
        )}
      </div>

      {/* Moon */}
      <div className="rounded-2xl border border-[rgba(168,169,173,0.2)] bg-[#111215] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#A8A9AD]">
            <Moon className="h-4 w-4 text-[#111111]" />
          </div>
          <h3 className="text-sm font-bold text-[#FAFAF8]">Moon</h3>
          {moonData && (
            <span
              className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${
                moonData.isVisible
                  ? "border border-[rgba(0,193,106,0.3)] bg-[rgba(0,193,106,0.2)] text-[#00C16A]"
                  : "border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#75777D]"
              }`}
            >
              {moonData.isVisible ? "Visible" : "Below horizon"}
            </span>
          )}
        </div>
        {moonData ? (
          <div className="space-y-2 text-xs text-[#A8A9AD]">
            <div className="flex justify-between">
              <span>Phase</span>
              <span className="font-mono text-[#FAFAF8]">{moonData.phase}</span>
            </div>
            <div className="flex justify-between">
              <span>Illumination</span>
              <span className="font-mono text-[#FAFAF8]">{moonData.illumination.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Rise / Set</span>
              <span className="font-mono text-[#FAFAF8]">
                {moonData.moonRise || "—"} / {moonData.moonSet || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Next Full</span>
              <span className="font-mono text-[#FAFAF8]">{moonData.nextFullMoon}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#75777D]">Calculating…</p>
        )}
      </div>

      {/* Visible Planets */}
      {visiblePlanets.length > 0 && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
              <Globe2 className="h-4 w-4 text-[#A8A9AD]" />
            </div>
            <h3 className="text-sm font-bold text-[#FAFAF8]">
              Visible Planets ({visiblePlanets.length})
            </h3>
          </div>
          <div className="space-y-2">
            {visiblePlanets.map((planet) => (
              <div
                key={planet.name}
                className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-2.5"
              >
                <div>
                  <p className="text-xs font-bold text-[#FAFAF8]">{planet.name}</p>
                  <p className="mt-0.5 text-[10px] text-[#75777D]">
                    Az: {planet.azimuth.toFixed(1)}° · El: {planet.elevation.toFixed(1)}°
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#A8A9AD]">Mag {planet.magnitude.toFixed(1)}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-[#75777D]" />
                    <span className="text-[10px] text-[#75777D]">
                      {planet.riseTime || "—"}–{planet.setTime || "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visible Constellations */}
      {visibleConstellations.length > 0 && (
        <div className="rounded-2xl border border-[rgba(168,169,173,0.2)] bg-[#111215] p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#A8A9AD]">
              <Stars className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-[#FAFAF8]">
              Constellations ({visibleConstellations.length})
            </h3>
          </div>
          <div className="space-y-2">
            {visibleConstellations.slice(0, 8).map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div>
                  <p className="text-xs font-bold text-[#FAFAF8]">{c.name}</p>
                  <p className="text-[10px] text-[#75777D]">{c.abbreviation}</p>
                </div>
                <span className="rounded-full border border-[rgba(0,193,106,0.3)] bg-[rgba(0,193,106,0.2)] px-2 py-1 text-[10px] font-bold text-[#00C16A]">
                  Visible
                </span>
              </div>
            ))}
            {visibleConstellations.length > 8 && (
              <p className="pt-1 text-center text-[10px] text-[#75777D]">
                +{visibleConstellations.length - 8} more above horizon
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
});
