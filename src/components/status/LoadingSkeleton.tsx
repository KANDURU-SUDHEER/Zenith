"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "card" | "list" | "text" | "circle" | "radar" | "globe" | "apod" | "timeline";
  count?: number;
}

/**
 * Beautiful loading skeletons for every module.
 * Designed to match the dark space theme of Project Zenith.
 */
export function LoadingSkeleton({ className, variant = "card", count = 1 }: LoadingSkeletonProps) {
  switch (variant) {
    case "card":
      return (
        <div className={cn("space-y-3", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border-subtle bg-surface-secondary p-4"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-star-white/5" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-star-white/5" style={{ animationDelay: "100ms" }} />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-star-white/5" style={{ animationDelay: "200ms" }} />
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-2", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md p-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-star-white/5" style={{ animationDelay: `${i * 75}ms` }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/2 animate-pulse rounded bg-star-white/5" style={{ animationDelay: `${i * 75 + 50}ms` }} />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-star-white/5" style={{ animationDelay: `${i * 75 + 100}ms` }} />
              </div>
            </div>
          ))}
        </div>
      );

    case "text":
      return (
        <div className={cn("space-y-2", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-star-white/5"
              style={{ width: `${70 + (i * 13) % 30}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      );

    case "circle":
      return (
        <div className={cn("flex items-center justify-center", className)}>
          <div className="h-16 w-16 animate-pulse rounded-full bg-star-white/5" />
        </div>
      );

    case "radar":
      return (
        <div className={cn("flex h-full items-center justify-center", className)}>
          <div className="relative h-64 w-64">
            {/* Concentric rings */}
            <div className="absolute inset-0 animate-pulse rounded-full border border-star-white/5" />
            <div className="absolute inset-8 animate-pulse rounded-full border border-star-white/5" style={{ animationDelay: "200ms" }} />
            <div className="absolute inset-16 animate-pulse rounded-full border border-star-white/5" style={{ animationDelay: "400ms" }} />
            <div className="absolute inset-24 animate-pulse rounded-full border border-star-white/5" style={{ animationDelay: "600ms" }} />
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-cosmic-400/20" />
            {/* Sweep line */}
            <div className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom animate-spin bg-gradient-to-t from-cosmic-400/30 to-transparent" style={{ animationDuration: "4s" }} />
          </div>
        </div>
      );

    case "globe":
      return (
        <div className={cn("flex h-full items-center justify-center", className)}>
          <div className="relative h-48 w-48">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-cosmic-500/10 via-space-700/30 to-space-900/30" />
            <div className="absolute -inset-2 rounded-full bg-cosmic-400/5 blur-xl" />
            <div className="absolute inset-0 animate-spin rounded-full border border-star-white/5 border-t-cosmic-400/20" style={{ animationDuration: "8s" }} />
          </div>
        </div>
      );

    case "apod":
      return (
        <div className={cn("space-y-4 p-6", className)}>
          <div className="aspect-video w-full animate-pulse rounded-xl bg-star-white/5" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-star-white/5" style={{ animationDelay: "100ms" }} />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-star-white/5" style={{ animationDelay: "200ms" }} />
            <div className="h-3 w-full animate-pulse rounded bg-star-white/5" style={{ animationDelay: "300ms" }} />
            <div className="h-3 w-2/3 animate-pulse rounded bg-star-white/5" style={{ animationDelay: "400ms" }} />
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className={cn("flex items-center gap-4 px-4", className)}>
          <div className="h-3 w-20 animate-pulse rounded bg-star-white/5" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-6 animate-pulse rounded-md bg-star-white/5" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-star-white/5" />
        </div>
      );

    default:
      return null;
  }
}
