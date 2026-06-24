"use client";

import { Globe, Radar, Sparkles, Stars, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardView } from "./dashboard-shell";

interface MobileNavProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onOpenSkyGuide: () => void;
  onOpenTimeline: () => void;
}

const NAV_ITEMS: Array<{
  id: DashboardView | "ai" | "timeline";
  label: string;
  icon: typeof Globe;
}> = [
  { id: "globe", label: "Globe", icon: Globe },
  { id: "radar", label: "Radar", icon: Radar },
  { id: "solar-system", label: "Solar", icon: Orbit },
  { id: "apod", label: "APOD", icon: Sparkles },
  { id: "ai", label: "AI", icon: Stars },
];

/**
 * Mobile bottom navigation bar — replaces sidebar on small screens.
 * Fixed to bottom with safe area support.
 */
export function MobileNav({ activeView, onViewChange, onOpenSkyGuide }: MobileNavProps) {
  return (
    <nav
      className="flex h-16 items-center justify-around border-t border-border-cream bg-surface-primary/98 backdrop-blur-xl"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      role="tablist"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.id === "ai"
            ? false
            : activeView === item.id;

        const handlePress = () => {
          if (item.id === "ai") {
            onOpenSkyGuide();
          } else {
            onViewChange(item.id as DashboardView);
          }
        };

        return (
          <button
            key={item.id}
            onClick={handlePress}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all duration-200",
              isActive
                ? "text-cherry-400"
                : "text-cream-500 active:text-cream-300"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(154,0,2,0.6)]")} />
            <span className={cn("mobile-nav-label text-[10px] font-semibold tracking-wide", isActive && "text-cherry-300")}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
