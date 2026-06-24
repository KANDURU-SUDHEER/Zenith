"use client";

import { Globe, Radar, PanelLeft, PanelRight, Rocket, Sparkles, Orbit } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/search/global-search";
import { LiveBadge } from "@/components/status/LiveBadge";
import type { DashboardView } from "./dashboard-shell";

interface DashboardHeaderProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onToggleSidebar: () => void;
  onToggleDetails: () => void;
}

export function DashboardHeader({
  activeView,
  onViewChange,
  onToggleSidebar,
  onToggleDetails,
}: DashboardHeaderProps) {
  return (
    <header className="relative z-[100] flex h-14 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/98 px-3 backdrop-blur-xl md:h-16 md:px-6">
      {/* Left: Logo + Sidebar Toggle */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleSidebar}
          className="hidden rounded-xl p-2.5 text-[#A8A9AD] transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAF8] active:scale-95 md:inline-flex"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-3" aria-label="Project Zenith home">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
            <Rocket className="h-4.5 w-4.5 text-[#FAFAF8]" />
          </div>
          <span className="hidden font-display text-base font-bold tracking-tight text-[#FAFAF8] sm:inline">
            Zenith
          </span>
        </Link>

        {/* Live Badge in header */}
        <LiveBadge className="hidden md:flex" />
      </div>

      {/* Center: View Switcher + Search */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        {/* View Tabs — hidden on mobile (bottom nav replaces) */}
        <div className="hidden items-center rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-1 backdrop-blur-sm md:flex">
          <button
            onClick={() => onViewChange("globe")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 md:gap-2 md:px-4",
              activeView === "globe"
                ? "bg-[#E7E3D8] text-[#111111]"
                : "text-[#A8A9AD] hover:text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]"
            )}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden lg:inline">Globe</span>
          </button>
          <button
            onClick={() => onViewChange("radar")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 md:gap-2 md:px-4",
              activeView === "radar"
                ? "bg-[#E7E3D8] text-[#111111]"
                : "text-[#A8A9AD] hover:text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]"
            )}
          >
            <Radar className="h-4 w-4" />
            <span className="hidden lg:inline">Radar</span>
          </button>
          <button
            onClick={() => onViewChange("solar-system")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 md:gap-2 md:px-4",
              activeView === "solar-system"
                ? "bg-[#E7E3D8] text-[#111111]"
                : "text-[#A8A9AD] hover:text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]"
            )}
          >
            <Orbit className="h-4 w-4" />
            <span className="hidden lg:inline">Solar System</span>
          </button>
          <button
            onClick={() => onViewChange("apod")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 md:gap-2 md:px-4",
              activeView === "apod"
                ? "bg-[#E7E3D8] text-[#111111]"
                : "text-[#A8A9AD] hover:text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden lg:inline">APOD</span>
          </button>
        </div>

        {/* Global Search */}
        <GlobalSearch />
      </div>

      {/* Right: Details Panel Toggle */}
      <button
        onClick={onToggleDetails}
        className="hidden rounded-xl p-2.5 text-[#A8A9AD] transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#FAFAF8] active:scale-95 md:inline-flex"
        aria-label="Toggle details panel"
      >
        <PanelRight className="h-5 w-5" />
      </button>
    </header>
  );
}
