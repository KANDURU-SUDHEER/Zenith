"use client";

import { Activity, Layers } from "lucide-react";
import { GlobalSearch } from "@/components/search/global-search";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileOverlayControlsProps {
  onOpenInfo: () => void;
  onOpenTools: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Minimal floating controls that stay on top of the globe.
 *
 * Top-left:  Mission Data button (Activity icon) → opens mission data sidebar
 * Top-right: GlobalSearch + Layers button        → opens tools sidebar
 *
 * Both icons are filled/stroked at the same visual weight as Layers,
 * so neither gets lost against the dark globe.
 * All buttons meet 44×44px minimum touch target.
 */
export function MobileOverlayControls({
  onOpenInfo,
  onOpenTools,
}: MobileOverlayControlsProps) {
  return (
    <>
      {/* Top-left: Mission Data */}
      <div
        className="pointer-events-auto absolute left-3 z-20"
        style={{ top: "calc(12px + env(safe-area-inset-top, 0px))" }}
      >
        <GlassButton onClick={onOpenInfo} aria-label="Open Mission Data" title="Mission Data">
          <Activity className="h-5 w-5 text-[#FAFAF8]" />
        </GlassButton>
      </div>

      {/* Top-right: Search + Controls */}
      <div
        className="pointer-events-auto absolute right-3 z-20 flex items-center gap-2"
        style={{ top: "calc(12px + env(safe-area-inset-top, 0px))" }}
      >
        <div className="pointer-events-auto">
          <GlobalSearch />
        </div>
        <GlassButton onClick={onOpenTools} aria-label="Open Controls & Filters" title="Controls & Filters">
          <Layers className="h-5 w-5 text-[#FAFAF8]" />
        </GlassButton>
      </div>
    </>
  );
}

// ─── Glass Button ─────────────────────────────────────────────────────────────

function GlassButton({
  children,
  onClick,
  "aria-label": ariaLabel,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.10)] bg-[#0D0E10]/85 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all hover:bg-[rgba(255,255,255,0.10)] active:scale-95"
    >
      {children}
    </button>
  );
}
