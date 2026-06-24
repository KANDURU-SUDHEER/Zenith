"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LastUpdatedProps {
  /** The timestamp to display relative time for */
  timestamp: Date | number | null;
  /** Optional className */
  className?: string;
  /** Optional prefix text */
  prefix?: string;
  /** Update interval for relative time display (ms) */
  updateInterval?: number;
}

/**
 * Displays a human-readable "last updated" time that auto-refreshes.
 * Shows: "just now", "5s ago", "1m ago", "5m ago", etc.
 */
export function LastUpdated({
  timestamp,
  className,
  prefix = "Updated",
  updateInterval = 1000,
}: LastUpdatedProps) {
  const [, forceUpdate] = useState(0);

  // Re-render periodically to keep the relative time fresh
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), updateInterval);
    return () => clearInterval(interval);
  }, [updateInterval]);

  if (!timestamp) {
    return (
      <span className={cn("text-[10px] text-star-white/30", className)}>
        {prefix} —
      </span>
    );
  }

  const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const relative = formatRelativeTime(time);

  return (
    <time
      dateTime={new Date(time).toISOString()}
      className={cn("text-[10px] text-star-white/40", className)}
      aria-label={`${prefix} ${relative}`}
    >
      {prefix} {relative}
    </time>
  );
}

/**
 * Format a timestamp into a human-readable relative string.
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
