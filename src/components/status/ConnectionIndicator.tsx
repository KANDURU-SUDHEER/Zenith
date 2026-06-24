"use client";

import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionIndicatorProps {
  className?: string;
}

/**
 * Displays current network connection status.
 * Shows "Connected" when online, "Offline Mode" when disconnected.
 */
export function ConnectionIndicator({ className }: ConnectionIndicatorProps) {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[10px]",
        isOnline ? "text-star-white/40" : "text-red-400",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={isOnline ? "Connected to internet" : "No internet connection"}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
}
