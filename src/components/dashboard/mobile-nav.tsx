"use client";

import { Globe, Radar, Sparkles, Stars, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardView } from "./dashboard-shell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobileNavProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onOpenSkyGuide: () => void;
  onOpenTimeline: () => void;
}

type NavItemId = DashboardView | "ai";

interface NavItem {
  id: NavItemId;
  label: string;
  icon: typeof Globe;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "globe",        label: "Globe",  icon: Globe    },
  { id: "radar",        label: "Radar",  icon: Radar    },
  { id: "solar-system", label: "Solar",  icon: Orbit    },
  { id: "apod",         label: "APOD",   icon: Sparkles },
  { id: "ai",           label: "AI",     icon: Stars    },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Mobile bottom navigation bar.
 *
 * NEVER hidden — always rendered regardless of panel state.
 * z-50 ensures it sits above sidebars (which are z-40/z-50 but anchored in
 * the document flow, not in the nav stacking context).
 */
export function MobileNav({
  activeView,
  onViewChange,
  onOpenSkyGuide,
}: MobileNavProps) {
  return (
    <nav
      className="relative z-50 flex h-14 shrink-0 items-center justify-around border-t border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/98 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="tablist"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.id === "ai"
            ? false
            : activeView === (item.id as DashboardView);

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
              "relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200",
              isActive ? "text-[#00C16A]" : "text-[#75777D]"
            )}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute top-1 h-1 w-1 rounded-full bg-[#00C16A]"
                aria-hidden="true"
              />
            )}

            <item.icon
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isActive && "drop-shadow-[0_0_6px_rgba(0,193,106,0.7)]"
              )}
            />
            <span
              className={cn(
                "mobile-nav-label text-[10px] font-semibold tracking-wide transition-colors duration-200",
                isActive ? "text-[#00C16A]" : "text-[#75777D]"
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
