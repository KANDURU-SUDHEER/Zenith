"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  date: string;
  copyright?: string;
  _source?: string;
}

const MOCK_APOD: ApodData = {
  title: "Loading Today's Image",
  explanation:
    "The Astronomy Picture of the Day is loading. NASA's APOD features a different image or photograph of our fascinating universe each day, accompanied by a brief explanation written by a professional astronomer. Check back in a moment.",
  url: "https://apod.nasa.gov/apod/image/2211/PillarsOfCreation_Webb_1080.jpg",
  media_type: "image",
  date: new Date().toISOString().split("T")[0]!,
  copyright: "NASA, ESA, CSA, STScI",
};

function todayUTC(): string {
  return new Date().toISOString().split("T")[0]!;
}

async function fetchApod(): Promise<ApodData> {
  try {
    const response = await fetch("/api/nasa/apod", { cache: "no-store" });
    if (!response.ok) throw new Error("APOD API route failed");
    return await response.json();
  } catch {
    return MOCK_APOD;
  }
}

/**
 * Returns milliseconds until the next UTC midnight.
 * Used to schedule an exact midnight refresh.
 */
function msUntilMidnightUTC(): number {
  const now = Date.now();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now);
}

export function useApod() {
  // Track current UTC date as state so a date change triggers a re-render
  // and therefore a new queryKey → TanStack Query fetches fresh data.
  const [currentDate, setCurrentDate] = useState(todayUTC);
  const queryClient = useQueryClient();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function scheduleNextMidnight() {
      const ms = msUntilMidnightUTC();

      timeout = setTimeout(() => {
        const newDate = todayUTC();
        setCurrentDate(newDate);

        // Immediately invalidate the old query so it gets garbage-collected
        // and the new query for the new day fetches right away.
        queryClient.invalidateQueries({ queryKey: ["apod"] });

        // Schedule the next midnight (24h later)
        scheduleNextMidnight();
      }, ms);
    }

    scheduleNextMidnight();
    return () => clearTimeout(timeout);
  }, [queryClient]);

  return useQuery<ApodData>({
    // currentDate in the key means when the date state changes at midnight,
    // TanStack Query sees a brand-new query and fetches immediately.
    queryKey: ["apod", currentDate],
    queryFn: fetchApod,
    // Mark data as stale at midnight — exact ms until 00:00:00 UTC.
    staleTime: msUntilMidnightUTC,
    // Keep old data in cache for 2 hours past midnight (graceful degradation).
    gcTime: 2 * 60 * 60 * 1000,
    placeholderData: MOCK_APOD,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });
}

/**
 * Prefetch APOD data during idle time so it's ready when the user opens the tab.
 */
export function prefetchApod() {
  if (typeof window !== "undefined") {
    fetch("/api/nasa/apod", { cache: "no-store" }).catch(() => {});
  }
}
