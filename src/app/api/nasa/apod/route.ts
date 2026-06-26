import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

// Do NOT use force-dynamic — let Next.js ISR cache this route at the edge.
// The revalidation period is calculated per-request (seconds until midnight UTC)
// and set on the response headers so the CDN/edge caches it correctly.
// export const dynamic = "force-dynamic";  ← removed: was bypassing all caching

export async function GET() {
  const { NASA_API_KEY } = getServerEnv();
  const now = new Date();

  // ── Seconds until next UTC midnight ─────────────────────────────────────
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0,
  ));
  const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));

  // ── Shared Cache-Control header ──────────────────────────────────────────
  // s-maxage  → CDN/edge caches the response until midnight
  // stale-while-revalidate → serves stale while refreshing in the background
  const cacheHeaders = {
    "Cache-Control": `public, s-maxage=${secondsUntilMidnight}, stale-while-revalidate=300`,
  };

  // Helper: try fetching APOD for a specific date (or no date = NASA's default today)
  async function fetchApodForDate(date?: string): Promise<Response> {
    const url = date
      ? `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${date}`
      : `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
    return fetch(url, {
      signal: AbortSignal.timeout(15_000),
      next:   { revalidate: secondsUntilMidnight },
    } as RequestInit);
  }

  try {
    // ── First attempt: no date param — let NASA decide "today" ─────────────
    // Avoids 404s caused by timezone skew between our server and NASA's
    // publish schedule (NASA publishes around midnight US Eastern time).
    let response = await fetchApodForDate();

    // ── If NASA returned 404, try yesterday as a safe fallback ─────────────
    // This handles the brief window after UTC midnight but before NASA
    // publishes the next image (~05:00–06:00 UTC / midnight US Eastern).
    if (response.status === 404) {
      const yesterday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 1,
      )).toISOString().split("T")[0]!;
      response = await fetchApodForDate(yesterday);
    }

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Rate limited", _source: "rate_limited" },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!response.ok) {
      throw new Error(`NASA APOD returned ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Ensure url is never empty — if NASA somehow returns no url, treat as error
    if (!data.url || data.url === "") {
      throw new Error("NASA APOD returned empty url");
    }

    return NextResponse.json(
      { ...data, _source: "live" },
      { headers: cacheHeaders },
    );

  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";

    // On timeout or any error, return 503 so the client shows the retry UI
    // rather than silently displaying a broken fallback with no image.
    return NextResponse.json(
      {
        error: isTimeout
          ? "NASA API timed out — please try again"
          : "Could not load APOD — please try again",
        _source: isTimeout ? "timeout" : "error",
        _error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
