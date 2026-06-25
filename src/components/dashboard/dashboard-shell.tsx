"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardHeader } from "./dashboard-header";
import { Sidebar } from "./sidebar";
import { DetailsPanel } from "./details-panel";
import { TimelineBar } from "./timeline-bar";
import { MobileNav } from "./mobile-nav";
import { MobileInfoSidebar } from "./mobile-info-sidebar";
import { MobileToolsSidebar } from "./mobile-tools-sidebar";
import { MobileOverlayControls } from "./mobile-overlay-controls";
import { MobileMissionCard } from "./mobile-mission-card";
import { CategoryMenu } from "./category-menu";
import { GlobeView } from "@/components/globe/globe-view";
import { LocationHydration } from "@/providers/location-hydration";
import { OrbitalEngineProvider } from "@/providers/orbital-engine-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingSkeleton } from "@/components/status/LoadingSkeleton";
import { useIsMobile, useIsTablet } from "@/hooks/use-media-query";
import { prefetchApod } from "@/hooks/use-apod";

// ─── Lazy modules ─────────────────────────────────────────────────────────────

const ZenithRadar = dynamic(
  () => import("@/components/radar/zenith-radar").then((m) => ({ default: m.ZenithRadar })),
  { ssr: false, loading: () => <LoadingSkeleton variant="radar" className="h-full" /> }
);

const APODView = dynamic(
  () => import("@/components/apod/apod-view").then((m) => ({ default: m.APODView })),
  { ssr: false, loading: () => <LoadingSkeleton variant="apod" className="h-full" /> }
);

const SolarSystemScene = dynamic(
  () => import("@/components/solar-system/solar-system-scene").then((m) => ({ default: m.SolarSystemScene })),
  { ssr: false, loading: () => <LoadingSkeleton variant="radar" className="h-full" /> }
);

const SkyGuidePanel = dynamic(
  () => import("@/components/sky-guide/sky-guide-panel").then((m) => ({ default: m.SkyGuidePanel })),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardView = "globe" | "radar" | "solar-system" | "apod";

// ─── Edge-swipe threshold (px from screen edge to trigger sidebar) ─────────────
const EDGE_THRESHOLD = 30;

// ─── CategoryMenuPositioned ───────────────────────────────────────────────────
// Wraps CategoryMenu and subscribes to satellite store to shift upward
// when a mission card is visible, preventing overlap.

import { memo } from "react";
import { useSatelliteStore } from "@/stores/satellite-store";

const CategoryMenuPositioned = memo(function CategoryMenuPositioned({
  isMobile,
}: { isMobile: boolean }) {
  const hasSatellite = useSatelliteStore((s) => s.selectedSatellite !== null);

  return (
    <div
      className={[
        "pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 transition-all duration-300",
        isMobile ? "" : "bottom-4",
      ].join(" ")}
      style={
        isMobile
          ? {
              // Sit above the nav bar (56px + safe-area).
              // When a satellite card is selected, add another 64px (card 56px + 8px gap).
              bottom: hasSatellite
                ? "calc(8.5rem + env(safe-area-inset-bottom, 0px))"
                : "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
            }
          : undefined
      }
    >
      <CategoryMenu />
    </div>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardShell() {
  const [activeView, setActiveView] = useState<DashboardView>("globe");
  // ── Mobile panel state — exclusive single source of truth ───────────────
  // Only one panel can be open at a time on mobile.
  // On desktop, skyGuide is managed separately (it's a full overlay).
  const [skyGuideOpen, setSkyGuideOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"info" | "tools" | "timeline" | null>(null);

  const mobileInfoOpen     = mobilePanel === "info";
  const mobileToolsOpen    = mobilePanel === "tools";
  const mobileTimelineOpen = mobilePanel === "timeline";

  const openMobilePanel = useCallback((panel: "info" | "tools" | "timeline") => {
    setMobilePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const closeMobilePanel = useCallback(() => setMobilePanel(null), []);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // ── Desktop panel open/close state ──────────────────────────────────────
  const defaultOpen = !isMobile && !isTablet;
  const breakpointKey = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

  const [sidebarOverrides, setSidebarOverrides] = useState<Record<string, boolean>>({});
  const [detailsOverrides, setDetailsOverrides] = useState<Record<string, boolean>>({});

  const sidebarOpen =
    sidebarOverrides[breakpointKey] !== undefined
      ? sidebarOverrides[breakpointKey]!
      : defaultOpen;
  const detailsOpen =
    detailsOverrides[breakpointKey] !== undefined
      ? detailsOverrides[breakpointKey]!
      : defaultOpen;

  const setSidebarOpen = useCallback(
    (v: boolean) =>
      setSidebarOverrides((prev) => ({ ...prev, [breakpointKey]: v })),
    [breakpointKey]
  );
  const setDetailsOpen = useCallback(
    (v: boolean) =>
      setDetailsOverrides((prev) => ({ ...prev, [breakpointKey]: v })),
    [breakpointKey]
  );

  // ── Edge-swipe gesture detection ─────────────────────────────────────────
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      // Reject diagonal / mostly-vertical gestures
      if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 0.8) return;

      const screenW = window.innerWidth;

      if (dx > 0 && start.x < EDGE_THRESHOLD && !mobileInfoOpen) {
        openMobilePanel("info");
        return;
      }
      if (dx < 0 && start.x > screenW - EDGE_THRESHOLD && !mobileToolsOpen) {
        openMobilePanel("tools");
        return;
      }
      if (dx < -40 && mobileInfoOpen) {
        closeMobilePanel();
        return;
      }
      if (dx > 40 && mobileToolsOpen) {
        closeMobilePanel();
        return;
      }
    },
    [mobileInfoOpen, mobileToolsOpen, openMobilePanel, closeMobilePanel]
  );

  // ── Android Back key — close the active panel first ──────────────────────
  useEffect(() => {
    if (!isMobile) return;
    const handleBack = (e: PopStateEvent) => {
      if (mobilePanel !== null) {
        e.preventDefault();
        closeMobilePanel();
        // Push a new state so the next back press doesn't exit the app
        history.pushState(null, "", location.href);
      }
    };
    // Push an initial state so we can intercept the first back press
    if (mobilePanel !== null) {
      history.pushState(null, "", location.href);
    }
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [isMobile, mobilePanel, closeMobilePanel]);

  // ── Prefetch APOD after idle (guarded for Safari iOS ≤17 which lacks rIC) ─
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => prefetchApod(), { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    // Fallback for Safari iOS ≤17
    const t = setTimeout(() => prefetchApod(), 3000);
    return () => clearTimeout(t);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // SINGLE unified component tree.
  //
  // CRITICAL: Both mobile and desktop share the same tree so GlobeView
  // (and its WebGL CesiumGlobe child) is NEVER unmounted when the layout
  // mode switches.  Layout differences are expressed via conditional className
  // and conditional rendering of specific panels, NOT by swapping the entire
  // return path.
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <OrbitalEngineProvider>
      <div
        className={`flex overflow-hidden bg-space-950 ${
          isMobile ? "h-[100dvh] flex-col" : "h-screen flex-col"
        }`}
      >
        <LocationHydration />

        {/* ── Desktop-only header ───────────────────────────────────────── */}
        {!isMobile && (
          <DashboardHeader
            activeView={activeView}
            onViewChange={setActiveView}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleDetails={() => setDetailsOpen(!detailsOpen)}
          />
        )}

        <div className="relative flex min-h-0 flex-1">
          {/* ── Desktop left sidebar ──────────────────────────────────────── */}
          {!isMobile && sidebarOpen && (
            <div className="relative h-full shrink-0">
              <Sidebar onOpenSkyGuide={() => setSkyGuideOpen(true)} />
            </div>
          )}

          {/* ── Center: visualization area ────────────────────────────────── */}
          <main
            className="relative min-w-0 flex-1"
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchEnd={isMobile ? handleTouchEnd : undefined}
          >
            {/* Globe — always mounted, never unmounted.
                Switching views hides it via opacity/pointer-events so the
                WebGL context stays alive and Cesium doesn't crash.            */}
            <div
              className={
                activeView === "globe"
                  ? "relative h-full w-full"
                  : "pointer-events-none absolute inset-0 opacity-0"
              }
            >
              <ErrorBoundary module="Globe">
                <GlobeView />
              </ErrorBoundary>

              {/* Category legend — only on globe view */}
              {activeView === "globe" && (
                <CategoryMenuPositioned isMobile={isMobile} />
              )}
            </div>

            {/* Radar */}
            {activeView === "radar" && (
              <div className="h-full w-full view-transition-enter">
                <ErrorBoundary module="Radar">
                  <Suspense fallback={<LoadingSkeleton variant="radar" className="h-full" />}>
                    <ZenithRadar />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}

            {/* Solar System */}
            {activeView === "solar-system" && (
              <div className="h-full w-full view-transition-enter">
                <ErrorBoundary module="Solar System">
                  <Suspense fallback={<LoadingSkeleton variant="radar" className="h-full" />}>
                    <SolarSystemScene />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}

            {/* APOD */}
            {activeView === "apod" && (
              <div className="h-full w-full view-transition-enter">
                <ErrorBoundary module="APOD">
                  <Suspense fallback={<LoadingSkeleton variant="apod" className="h-full" />}>
                    <APODView />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}

            {/* AI Sky Guide overlay */}
            {skyGuideOpen && (
              <ErrorBoundary module="AI Sky Guide">
                <Suspense fallback={null}>
                  <SkyGuidePanel
                    isOpen={skyGuideOpen}
                    onClose={() => setSkyGuideOpen(false)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* ── Mobile-only in-canvas overlays ───────────────────────── */}
            {isMobile && (
              <>
                {/* Floating controls: info + search + layers — only on globe view */}
                {activeView === "globe" && (
                  <MobileOverlayControls
                    onOpenInfo={() => openMobilePanel("info")}
                    onOpenTools={() => openMobilePanel("tools")}
                  />
                )}

                {/* Compact satellite mission card */}
                <MobileMissionCard />

                {/* Timeline drawer — slides up above nav bar */}
                {mobileTimelineOpen && (
                  <div
                    className="absolute inset-x-0 z-30 rounded-t-2xl border-t border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/95 shadow-2xl backdrop-blur-xl"
                    style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
                  >
                    <button
                      onClick={closeMobilePanel}
                      className="flex min-h-[44px] w-full items-center justify-center"
                      aria-label="Close timeline"
                    >
                      <div className="h-1 w-10 rounded-full bg-[rgba(255,255,255,0.15)]" />
                    </button>
                    <TimelineBar />
                  </div>
                )}
              </>
            )}
          </main>

          {/* ── Desktop right details panel ───────────────────────────────── */}
          {!isMobile && detailsOpen && (
            <div className="relative h-full shrink-0">
              <ErrorBoundary module="Details Panel">
                <DetailsPanel />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* ── Desktop timeline bar ──────────────────────────────────────────── */}
        {!isMobile && (
          <ErrorBoundary module="Timeline">
            <TimelineBar />
          </ErrorBoundary>
        )}

        {/* ── Mobile permanent bottom nav ──────────────────────────────────── */}
        {isMobile && (
          <MobileNav
            activeView={activeView}
            onViewChange={setActiveView}
            onOpenSkyGuide={() => setSkyGuideOpen(true)}
            onOpenTimeline={() => mobilePanel === "timeline" ? closeMobilePanel() : openMobilePanel("timeline")}
            skyGuideOpen={skyGuideOpen}
          />
        )}

        {/* ── Mobile sidebars (fixed overlay, outside main stacking context) ── */}
        {isMobile && (
          <>
            <MobileInfoSidebar
              isOpen={mobileInfoOpen}
              onClose={closeMobilePanel}
            />
            <MobileToolsSidebar
              isOpen={mobileToolsOpen}
              onClose={closeMobilePanel}
              onOpenSkyGuide={() => setSkyGuideOpen(true)}
              onOpenTimeline={() => openMobilePanel("timeline")}
            />
          </>
        )}
      </div>
    </OrbitalEngineProvider>
  );
}
