import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

// Do NOT use force-dynamic — let Next.js ISR cache this route at the edge.
// The revalidation period is calculated per-request (seconds until midnight UTC)
// and set on the response headers so the CDN/edge caches it correctly.
// export const dynamic = "force-dynamic";  ← removed: was bypassing all caching

export async function GET() {
  const { NASA_API_KEY } = getServerEnv();
  const now       = new Date();
  const todayUTC  = now.toISOString().split("T")[0]!;

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

  try {
    // Pass `next: { revalidate }` so Next.js's built-in fetch data cache also
    // stores the upstream NASA response for the same period. This means repeated
    // serverless invocations on the same instance (or via the edge cache) will
    // NOT hit NASA's API again — they get the cached response immediately.
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${todayUTC}`,
      {
        signal: AbortSignal.timeout(15_000),
        next:   { revalidate: secondsUntilMidnight },
      } as RequestInit,
    );

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Rate limited", _source: "rate_limited" },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!response.ok) {
      throw new Error(`NASA APOD returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(
      { ...data, _source: "live", _date: todayUTC },
      { headers: cacheHeaders },
    );

  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";

    // On timeout, return a 503 so the client knows to retry rather than
    // caching a fallback as if it were real data.
    if (isTimeout) {
      return NextResponse.json(
        { error: "NASA API timed out — please try again", _source: "timeout" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Generic fallback — only reached on non-timeout errors (DNS, network down, etc.)
    return NextResponse.json(
      {
        title: "Coronal Mass Ejection from the Sun",
        explanation:
          "The Sun's surface is a churning soup of energetic plasma. Magnetic field loops twist and snap, expelling billions of tons of plasma into space — a coronal mass ejection. NASA monitors these events because they can disrupt power grids and satellites on Earth.",
        url: "",
        media_type: "image",
        date: todayUTC,
        copyright: "NASA/SDO",
        _source: "fallback",
        _error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200, headers: cacheHeaders },
    );
  }
}
