"use client";

import { cn } from "@/lib/utils";
import { useSimulationClock } from "@/stores/simulation-clock";
import { useOnlineStatus } from "@/hooks/use-online-status";

type BadgeVariant = "live" | "simulation" | "paused" | "offline";

interface LiveBadgeProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Professional live status indicator.
 * Reflects current application state: LIVE, SIMULATION, PAUSED, or OFFLINE.
 */
export function LiveBadge({ className, showLabel = true }: LiveBadgeProps) {
  const { isLive, playbackState } = useSimulationClock();
  const isOnline = useOnlineStatus();

  let variant: BadgeVariant;
  let label: string;

  if (!isOnline) {
    variant = "offline";
    label = "OFFLINE";
  } else if (isLive) {
    variant = "live";
    label = "LIVE";
  } else if (playbackState === "paused") {
    variant = "paused";
    label = "PAUSED";
  } else {
    variant = "simulation";
    label = "SIMULATION";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        variant === "live" && "bg-[rgba(0,193,106,0.12)] text-[#00C16A] ring-1 ring-[rgba(0,193,106,0.2)]",
        variant === "simulation" && "bg-[rgba(255,255,255,0.04)] text-[#A8A9AD] ring-1 ring-[rgba(255,255,255,0.06)]",
        variant === "paused" && "bg-[rgba(255,255,255,0.06)] text-[#A8A9AD] ring-1 ring-[rgba(255,255,255,0.10)]",
        variant === "offline" && "bg-[rgba(255,255,255,0.04)] text-[#75777D] ring-1 ring-[rgba(255,255,255,0.06)]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`System status: ${label}`}
    >
      {/* Animated dot */}
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "live" && "animate-pulse bg-[#00C16A]",
          variant === "simulation" && "bg-[#A8A9AD]",
          variant === "paused" && "bg-[#A8A9AD]",
          variant === "offline" && "bg-[#75777D]"
        )}
        style={
          variant === "live"
            ? { animationDuration: "2s" }
            : undefined
        }
      />
      {showLabel && <span>{label}</span>}
    </div>
  );
}
