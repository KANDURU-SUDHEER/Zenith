"use client";

import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  className?: string;
}

/**
 * Shows an unobtrusive banner when the user goes offline.
 * Informs that cached data is being used and simulation still works.
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 bg-red-500/10 px-4 py-1.5 text-xs text-red-300",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        <strong>Offline Mode</strong> — Using cached data. Simulation and local computations still active.
      </span>
    </div>
  );
}
