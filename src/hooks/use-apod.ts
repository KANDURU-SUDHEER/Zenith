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
  // Add a cache-busting timestamp param so the browser never serves a cached
  // response from a previous day. The server handles its own caching.
  const res = await fetch(`/api/nasa/apod?t=${todayUTC()}`);
  if (!res.ok) throw new Error(`APOD fetch failed: ${res.status}`);
  const data = await res.json() as ApodData;
  // Validate the response has the minimum required fields
  if (!data.title || !data.media_type) throw new Error("Invalid APOD response");
  return data;
}

export function useApod() {
  const [currentDate, setCurrentDate] = useState(todayUTC);
  const queryClient = useQueryClient();

  // Schedule an exact-midnight refresh so tabs left open overnight auto-update
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
    queryKey:  ["apod", currentDate],
    queryFn:   fetchApod,
    staleTime: msUntilMidnightUTC(),   // stays fresh until midnight UTC
    gcTime:    2 * 60 * 60 * 1000,    // keep in cache 2 h past midnight
    retry:     2,                      // retry twice on network failure
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
    refetchInterval:      false,
    // No placeholderData — show the skeleton while loading,
    // not a stale mock that confuses the media-type rendering
  });
}

export function prefetchApod() {
  if (typeof window !== "undefined") {
    fetch(`/api/nasa/apod?t=${todayUTC()}`).catch(() => {});
  }
}
