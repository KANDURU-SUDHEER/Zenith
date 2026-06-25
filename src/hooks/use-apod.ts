"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: "image" | "video" | string;
  date: string;
  copyright?: string;
  _source?: string;
}

function todayUTC(): string {
  return new Date().toISOString().split("T")[0]!;
}

function msUntilMidnightUTC(): number {
  const now = Date.now();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(60_000, midnight.getTime() - now);
}

async function fetchApod(): Promise<ApodData> {
  // Cache-bust parameter prevents the browser from returning a stale day's
  // response, but the server route has its own edge/CDN cache keyed by date.
  const res = await fetch(`/api/nasa/apod?t=${todayUTC()}`, {
    // Tell the browser to revalidate (check server) rather than serving
    // a disk-cached response directly. The server handles the real caching.
    cache: "no-cache",
  });

  if (!res.ok) {
    // 503 = NASA timed out server-side — propagate as a retryable error
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `APOD fetch failed: ${res.status}`);
  }

  const data = await res.json() as ApodData;
  if (!data.title || !data.media_type) throw new Error("Invalid APOD response");
  return data;
}

export function useApod() {
  const [currentDate, setCurrentDate] = useState(todayUTC);
  const queryClient = useQueryClient();

  // Auto-refresh at exact UTC midnight so tabs open overnight get the new image
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    function schedule() {
      t = setTimeout(() => {
        const d = todayUTC();
        setCurrentDate(d);
        queryClient.invalidateQueries({ queryKey: ["apod"] });
        schedule();
      }, msUntilMidnightUTC());
    }
    schedule();
    return () => clearTimeout(t);
  }, [queryClient]);

  return useQuery<ApodData>({
    queryKey: ["apod", currentDate],
    queryFn:  fetchApod,

    // Stays fresh until midnight UTC — no unnecessary background refetches
    staleTime: msUntilMidnightUTC(),
    gcTime:    2 * 60 * 60 * 1000,   // keep 2 h past midnight

    // Retry up to 3 times with exponential backoff (1s, 2s, 4s)
    // This handles transient NASA API slowness without hammering the server
    retry:      3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),

    // Do NOT refetch on window focus — the data is valid until midnight,
    // refetching on focus wastes NASA quota and adds perceived latency
    refetchOnWindowFocus: false,
    refetchOnMount:       true,   // fetch if cache is empty when view mounts
    refetchInterval:      false,  // no polling — data doesn't change intraday
  });
}

export function prefetchApod() {
  if (typeof window !== "undefined") {
    fetch(`/api/nasa/apod?t=${todayUTC()}`, { cache: "no-cache" }).catch(() => {});
  }
}
