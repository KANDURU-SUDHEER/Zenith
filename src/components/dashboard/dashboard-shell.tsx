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

  // Default panel open state — derived, no effects needed.
  const defaultOpen = !isMobile && !isTablet; // true only on desktop ≥1024px

  // Per-breakpoint user toggle overrides stored as a map keyed by breakpoint.
  // When the breakpoint changes, the override for the new bucket starts as null
  // (so the default applies), making this purely derivable from render state.
  const breakpointKey = isMobile ? "mobile" : isTablet ? "tablet" : "desktop";
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

  // ─── Mobile Layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <OrbitalEngineProvider>
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-space-950">
          <LocationHydration />

          {/* Compact mobile header */}
          <DashboardHeader
            activeView={activeView}
            onViewChange={setActiveView}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onToggleDetails={() => setMobileDetailsOpen(!mobileDetailsOpen)}
          />

          {/* Main content area — full viewport */}
          <main className="relative min-h-0 flex-1">
            {/* Globe */}
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
              
              {/* Category Menu - Only show in globe view - positioned above mobile nav */}
              {activeView === "globe" && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[4.5rem] z-20 pointer-events-auto">
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

            {/* Mobile Details Bottom Sheet */}
            <MobileDetailsSheet
              isOpen={mobileDetailsOpen}
              onToggle={() => setMobileDetailsOpen(!mobileDetailsOpen)}
            />

            {/* AI Sky Guide — fullscreen on mobile */}
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

            {/* Mobile Timeline drawer */}
            {mobileTimelineOpen && (
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

          {/* Mobile Bottom Navigation */}
          <MobileNav
            activeView={activeView}
            onViewChange={setActiveView}
            onOpenSkyGuide={() => setSkyGuideOpen(true)}
            onOpenTimeline={() => setMobileTimelineOpen(!mobileTimelineOpen)}
          />
        </div>
      </OrbitalEngineProvider>
    );
  }

  // ─── Desktop / Tablet Layout ───────────────────────────────────────────────
  return (
    <OrbitalEngineProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-space-950">
        <LocationHydration />

        {/* Top Navigation */}
        <DashboardHeader
          activeView={activeView}
          onViewChange={setActiveView}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleDetails={() => setDetailsOpen(!detailsOpen)}
        />

        <div className="relative flex min-h-0 flex-1">
          {/* Left Sidebar — permanent on desktop, collapsible on tablet */}
          {sidebarOpen && (
            <div className="relative h-full shrink-0">
              <Sidebar onOpenSkyGuide={() => setSkyGuideOpen(true)} />
            </div>
          )}

          {/* Center Visualization */}
          <main className="relative min-w-0 flex-1">
            {/* Globe — always mounted, use opacity to preserve WebGL state.
                visibility:hidden zeros the WebGL drawingBuffer; opacity:0 keeps it alive. */}
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
              
              {/* Category Menu - Only show in globe view - positioned at absolute bottom */}
              {activeView === "globe" && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-4 z-20 pointer-events-auto">
                  <CategoryMenu />
                </div>
              )}
            </div>

            {activeView === "radar" && (
              <div className="h-full w-full view-transition-enter">
                <ErrorBoundary module="Radar">
                  <Suspense fallback={<LoadingSkeleton variant="radar" className="h-full" />}>
                    <ZenithRadar />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}

            {activeView === "solar-system" && (
              <div className="h-full w-full view-transition-enter">
                <ErrorBoundary module="Solar System">
                  <Suspense fallback={<LoadingSkeleton variant="radar" className="h-full" />}>
                    <SolarSystemScene />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}

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
          </main>

          {/* Right Details Panel — collapsible on tablet */}
          {detailsOpen && (
            <div className="relative h-full shrink-0">
              <ErrorBoundary module="Details Panel">
                <DetailsPanel />
              </ErrorBoundary>
            </div>
          )}
        </div>

        {/* Bottom Timeline */}
        <ErrorBoundary module="Timeline">
          <TimelineBar />
        </ErrorBoundary>
      </div>
    </OrbitalEngineProvider>
  );
}
