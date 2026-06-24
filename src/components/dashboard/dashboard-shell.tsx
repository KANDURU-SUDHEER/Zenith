"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardHeader } from "./dashboard-header";
import { Sidebar } from "./sidebar";
import { DetailsPanel } from "./details-panel";
import { TimelineBar } from "./timeline-bar";
import { MobileNav } from "./mobile-nav";
import { MobileDetailsSheet } from "./mobile-details-sheet";
import { CategoryMenu } from "./category-menu";
import { GlobeView } from "@/components/globe/globe-view";
import { LocationHydration } from "@/providers/location-hydration";
import { OrbitalEngineProvider } from "@/providers/orbital-engine-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingSkeleton } from "@/components/status/LoadingSkeleton";
import { useIsMobile, useIsTablet } from "@/hooks/use-media-query";
import { prefetchApod } from "@/hooks/use-apod";

// Lazy load heavy modules — only loaded when user activates them
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

export type DashboardView = "globe" | "radar" | "solar-system" | "apod";

export function DashboardShell() {
  const [activeView, setActiveView] = useState<DashboardView>("globe");
  const [skyGuideOpen, setSkyGuideOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Panel visibility driven by breakpoint + user toggle overrides.
  const defaultOpen = !isMobile && !isTablet;
  const breakpointKey = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";

  console.log("[SHELL] render", { isMobile, isTablet, activeView, breakpointKey });
  const [sidebarOverrides, setSidebarOverrides] = useState<Record<string, boolean>>({});
  const [detailsOverrides, setDetailsOverrides] = useState<Record<string, boolean>>({});

  const sidebarOpen = sidebarOverrides[breakpointKey] !== undefined
    ? sidebarOverrides[breakpointKey]!
    : defaultOpen;
  const detailsOpen = detailsOverrides[breakpointKey] !== undefined
    ? detailsOverrides[breakpointKey]!
    : defaultOpen;

  const setSidebarOpen = (v: boolean) =>
    setSidebarOverrides((prev) => ({ ...prev, [breakpointKey]: v }));
  const setDetailsOpen = (v: boolean) =>
    setDetailsOverrides((prev) => ({ ...prev, [breakpointKey]: v }));

  // Prefetch APOD data after idle
  useEffect(() => {
    const id = requestIdleCallback(() => prefetchApod(), { timeout: 5000 });
    return () => cancelIdleCallback(id);
  }, []);

  // ─── SINGLE unified tree — no conditional return based on isMobile ─────────
  //
  // CRITICAL: Both mobile and desktop must render through the SAME component
  // tree so that GlobeView (and its CesiumGlobe child) is NEVER unmounted due
  // to a layout-mode switch. Previously, two separate `return` paths existed:
  //   if (isMobile) return <OrbitalEngineProvider>…mobile…</OrbitalEngineProvider>
  //   return <OrbitalEngineProvider>…desktop…</OrbitalEngineProvider>
  //
  // On production, `useIsMobile()` uses getServerSnapshot()=false so the first
  // render produces isMobile=true (because !false). After hydration the real
  // matchMedia value resolves — on a desktop viewport this flips isMobile to
  // false, React switches return paths, unmounts the entire mobile tree
  // (including CesiumGlobe mid-import), then mounts the desktop tree fresh.
  // This caused the repeated "[INIT] before import → Cleanup" loop.
  //
  // Fix: single return path. Layout differences are expressed via className and
  // conditional rendering of specific panels, not top-level tree replacement.

  console.log("[SHELL] unified layout — isMobile:", isMobile);
  return (
    <OrbitalEngineProvider>
      <div className={`flex overflow-hidden bg-space-950 ${isMobile ? "h-[100dvh] flex-col" : "h-screen flex-col"}`}>
        <LocationHydration />

        {/* Top Navigation */}
        <DashboardHeader
          activeView={activeView}
          onViewChange={setActiveView}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleDetails={isMobile
            ? () => setMobileDetailsOpen(!mobileDetailsOpen)
            : () => setDetailsOpen(!detailsOpen)
          }
        />

        <div className="relative flex min-h-0 flex-1">
          {/* Left Sidebar — desktop/tablet only */}
          {!isMobile && sidebarOpen && (
            <div className="relative h-full shrink-0">
              <Sidebar onOpenSkyGuide={() => setSkyGuideOpen(true)} />
            </div>
          )}

          {/* Center Visualization — always rendered, layout-only changes */}
          <main className="relative min-w-0 flex-1">

            {/* Globe — always mounted regardless of activeView.
                Use opacity:0 to hide it so the WebGL context stays alive.
                visibility:hidden would zero the drawingBuffer and crash Cesium. */}
            <div
              className={
                activeView === "globe"
                  ? "h-full w-full relative"
                  : "absolute inset-0 opacity-0 pointer-events-none"
              }
            >
              <ErrorBoundary module="Globe">
                <GlobeView />
              </ErrorBoundary>

              {/* Category Menu */}
              {activeView === "globe" && (
                <div className={`absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto ${isMobile ? "bottom-[4.5rem]" : "bottom-4"}`}>
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

            {/* AI Sky Guide Overlay */}
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

            {/* Mobile-only: Details bottom sheet */}
            {isMobile && (
              <MobileDetailsSheet
                isOpen={mobileDetailsOpen}
                onToggle={() => setMobileDetailsOpen(!mobileDetailsOpen)}
              />
            )}

            {/* Mobile-only: Timeline drawer */}
            {isMobile && mobileTimelineOpen && (
              <div className="absolute inset-x-0 bottom-16 z-30 rounded-t-2xl border-t border-border-subtle bg-surface-primary/95 backdrop-blur-xl shadow-2xl">
                <button
                  onClick={() => setMobileTimelineOpen(false)}
                  className="flex w-full items-center justify-center py-2"
                >
                  <div className="h-1 w-10 rounded-full bg-star-white/20" />
                </button>
                <TimelineBar />
              </div>
            )}
          </main>

          {/* Right Details Panel — desktop/tablet only */}
          {!isMobile && detailsOpen && (
            <div className="relative h-full shrink-0">
              <ErrorBoundary module="Details Panel">
                <DetailsPanel />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* Bottom Timeline — desktop only (mobile uses drawer) */}
        {!isMobile && (
          <ErrorBoundary module="Timeline">
            <TimelineBar />
          </ErrorBoundary>
        )}

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileNav
            activeView={activeView}
            onViewChange={setActiveView}
            onOpenSkyGuide={() => setSkyGuideOpen(true)}
            onOpenTimeline={() => setMobileTimelineOpen(!mobileTimelineOpen)}
          />
        )}
      </div>
    </OrbitalEngineProvider>
  );
}
