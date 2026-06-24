"use client";

import { useRef, useLayoutEffect, memo } from "react";
import { Stars, Navigation } from "lucide-react";
import { useLocationStore } from "@/stores/location-store";
import { SatelliteSidebar } from "./satellite-sidebar";
import { FavoritesPanel } from "@/components/location/favorites-panel";
import { RecentSearchesPanel } from "@/components/location/recent-searches-panel";

interface SidebarProps {
  onOpenSkyGuide: () => void;
}

function SidebarComponent({ onOpenSkyGuide }: SidebarProps) {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const scrollRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef(0);

  // Preserve scroll position across all re-renders
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Restore scroll position immediately before paint
    element.scrollTop = scrollPositionRef.current;

    // Save scroll position continuously
    const handleScroll = () => {
      scrollPositionRef.current = element.scrollTop;
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  });

  return (
    <aside className="flex h-full w-52 flex-col overflow-hidden border-r border-[rgba(255,255,255,0.06)] bg-[#0D0E10] md:w-56 lg:w-64 xl:w-64">
      {/* Location Info */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#111215] p-5">
        <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-[#75777D]">
          <Navigation className="h-4 w-4" />
          <span>Current Location</span>
        </div>
        {selectedLocation ? (
          <div className="mt-4">
            <p className="text-base font-bold text-[#FAFAF8]">
              {selectedLocation.name || "Selected Point"}
            </p>
            {selectedLocation.state && (
              <p className="mt-1.5 text-sm text-[#A8A9AD]">
                {selectedLocation.state}{selectedLocation.country ? `, ${selectedLocation.country}` : ""}
              </p>
            )}
            {!selectedLocation.state && selectedLocation.country && (
              <p className="mt-1.5 text-sm text-[#A8A9AD]">
                {selectedLocation.country}
              </p>
            )}
            <p className="mt-2 font-mono text-xs text-[#75777D] bg-[rgba(255,255,255,0.03)] px-2 py-1 rounded-md inline-block border border-[rgba(255,255,255,0.06)]">
              {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
            </p>
            {selectedLocation.timezone && (
              <p className="mt-2 text-xs font-medium text-[#75777D]">
                🕐 {selectedLocation.timezone}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-[#75777D]">
            Click on the globe or search to select a location
          </p>
        )}
      </div>

      {/* Scrollable Content */}
      <nav 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-4" 
        style={{ scrollBehavior: 'auto', willChange: 'scroll-position' }}
        aria-label="Satellite filters"
      >
        {/* Satellite Filters */}
        <div className="pt-1">
          <SatelliteSidebar />
        </div>

        {/* Favorites Section */}
        <div className="mt-6 border-t border-[rgba(255,255,255,0.04)] pt-5">
          <FavoritesPanel />
        </div>

        {/* Recent Searches Section (limited to 3) */}
        <div className="mt-6 border-t border-[rgba(255,255,255,0.04)] pt-5">
          <RecentSearchesPanel maxItems={3} />
        </div>
      </nav>

      {/* Bottom: AI Sky Guide - Fixed at bottom with new design */}
      <div className="shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[#0D0E10] p-4">
        <button
          onClick={onOpenSkyGuide}
          className="group flex w-full items-center gap-3 rounded-xl bg-[rgba(0,193,106,0.08)] hover:bg-[rgba(0,193,106,0.12)] border border-[rgba(0,193,106,0.15)] px-4 py-4 transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(0,193,106,0.15)]">
            <Stars className="h-5 w-5 text-[#00C16A]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-[#FAFAF8]">AI Sky Guide</p>
            <p className="text-xs text-[#75777D] mt-0.5">Get intelligent insights</p>
          </div>
          <svg className="h-5 w-5 text-[#75777D] group-hover:text-[#A8A9AD] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

// Memoize to prevent re-renders when unrelated state changes (like simulation time)
export const Sidebar = memo(SidebarComponent);
