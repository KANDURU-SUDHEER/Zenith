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

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardShell() {
  const [activeView, setActiveView] = useState<DashboardView>("globe");
  const [skyGuideOpen, setSkyGuideOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);

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
        setMobileInfoOpen(true);
        return;
      }
      if (dx < 0 && start.x > screenW - EDGE_THRESHOLD && !mobileToolsOpen) {
        setMobileToolsOpen(true);
        return;
      }
      if (dx < -40 && mobileInfoOpen) {
        setMobileInfoOpen(false);
        return;
      }
      if (dx > 40 && mobileToolsOpen) {
        setMobileToolsOpen(false);
        return;
      }
    },
    [mobileInfoOpen, mobileToolsOpen]
  );

  // ── Prefetch APOD ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = requestIdleCallback(() => prefetchApod(), { timeout: 5000 });
    return () => cancelIdleCallback(id);
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
                <div
                  className={`pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 ${
                    isMobile ? "bottom-[4.5rem]" : "bottom-4"
                  }`}
                >
                  <CategoryMenu />
                </div>
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
                {/* Floating controls: info + search + layers */}
                <MobileOverlayControls
                  onOpenInfo={() => setMobileInfoOpen(true)}
                  onOpenTools={() => setMobileToolsOpen(true)}
                />

                {/* Compact satellite mission card */}
                <MobileMissionCard />

                {/* Timeline drawer — slides up above nav bar */}
                {mobileTimelineOpen && (
                  <div className="absolute inset-x-0 bottom-14 z-30 rounded-t-2xl border-t border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/95 shadow-2xl backdrop-blur-xl">
                    <button
                      onClick={() => setMobileTimelineOpen(false)}
                      className="flex w-full items-center justify-center py-2"
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
            onOpenTimeline={() => setMobileTimelineOpen((v) => !v)}
          />
        )}

        {/* ── Mobile sidebars (fixed overlay, outside main stacking context) ── */}
        {isMobile && (
          <>
            <MobileInfoSidebar
              isOpen={mobileInfoOpen}
              onClose={() => setMobileInfoOpen(false)}
            />
            <MobileToolsSidebar
              isOpen={mobileToolsOpen}
              onClose={() => setMobileToolsOpen(false)}
              onOpenSkyGuide={() => setSkyGuideOpen(true)}
              onOpenTimeline={() => setMobileTimelineOpen((v) => !v)}
            />
          </>
        )}
      </div>
    </OrbitalEngineProvider>
  );
}
