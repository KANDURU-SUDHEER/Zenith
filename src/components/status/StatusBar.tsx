"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSimulationClock } from "@/stores/simulation-clock";
import { useApiStatus } from "@/hooks/use-api-status";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { LiveBadge } from "./LiveBadge";
import { LastUpdated } from "./LastUpdated";
import { ApiStatusPanel } from "./ApiStatusPanel";
import { Activity } from "lucide-react";

interface StatusBarProps {
  className?: string;
}

/**
 * Global Status Bar — Mission Control style.
 * Displays: Live status | Last Updated | UTC | Local | API Health
 * Shown at the top of the dashboard header.
 */
export function StatusBar({ className }: StatusBarProps) {
  const { simulatedTime, isLive } = useSimulationClock();
  const { summary, lastChecked } = useApiStatus();
  const isOnline = useOnlineStatus();
  const [showApiPanel, setShowApiPanel] = useState(false);

  const utcTime = simulatedTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  const localTime = simulatedTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    .split("/").pop()?.replace(/_/g, " ") ?? "Local";

  return (
    <div
      className={cn(
        "flex h-7 items-center justify-between border-b border-border-subtle bg-surface-secondary/50 px-4 text-[10px]",
        className
      )}
      role="status"
      aria-label="Mission control status bar"
      aria-live="polite"
    >
      {/* Left: Live Badge + Last Updated */}
      <div className="flex items-center gap-3">
        <LiveBadge />
        {isOnline && <LastUpdated timestamp={lastChecked} prefix="Updated" />}
        {!isOnline && (
          <span className="text-red-400/70">Offline — using cached data</span>
        )}
      </div>

      {/* Center: Time displays */}
      <div className="hidden items-center gap-4 font-mono sm:flex">
        <span className="text-star-white/50">
          UTC <span className="text-star-white/70">{utcTime}</span>
        </span>
        <span className="text-star-white/30">|</span>
        <span className="text-star-white/50">
          {localTz} <span className="text-star-white/70">{localTime}</span>
        </span>
        {!isLive && (
          <>
            <span className="text-star-white/30">|</span>
            <span className="text-blue-400/70">Simulated</span>
          </>
        )}
      </div>

      {/* Right: API Health Summary */}
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => setShowApiPanel(!showApiPanel)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-colors hover:bg-surface-glass",
            summary.offline > 0 && "text-red-400",
            summary.warning > 0 && summary.offline === 0 && "text-amber-400",
            summary.offline === 0 && summary.warning === 0 && "text-green-400/70"
          )}
          aria-label={`API health: ${summary.healthy} of ${summary.total} services healthy`}
          aria-expanded={showApiPanel}
        >
          <Activity className="h-3 w-3" />
          <span>
            APIs {summary.healthy}/{summary.total}
          </span>
          {summary.offline > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          )}
        </button>

        {/* Dropdown API Panel */}
        {showApiPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowApiPanel(false)}
            />
            {/* Panel */}
            <div className="absolute right-0 top-full z-50 mt-1 w-[min(320px,calc(100vw-1rem))] shadow-xl">
              <ApiStatusPanel compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
