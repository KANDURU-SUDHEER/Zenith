import { NextResponse } from "next/server";

/**
 * Server-side TLE proxy for CelesTrak.
 * Avoids CORS issues with direct browser requests and handles rate limiting.
 *
 * Caching strategy:
 * - Small groups (< 2MB): use Next.js fetch cache via `next.revalidate`
 * - Starlink (> 2MB): skip Next.js fetch cache (2MB limit) — the response
 *   `Cache-Control` header handles caching at the CDN/browser level instead.
 */

const CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php";

/**
 * Supplemental Starlink URL — recommended alternative to the rate-limited GROUP endpoint.
 */
const CELESTRAK_STARLINK_URL =
  "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle";

const GROUP_MAP: Record<string, string> = {
  stations: "stations",
  starlink: "__starlink__", // handled specially
  "gps-ops": "gps-ops",
  weather: "weather",
  geo: "geo",
  resource: "resource",
  science: "science",
  military: "military",
};

/** Groups whose TLE payload regularly exceeds Next.js's 2 MB fetch-cache limit. */
const LARGE_GROUPS = new Set(["__starlink__"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");

  if (!group || !GROUP_MAP[group]) {
    return NextResponse.json(
      { error: "Invalid group parameter" },
      { status: 400 }
    );
  }

  const groupKey = GROUP_MAP[group]!;
  const isLarge = LARGE_GROUPS.has(groupKey);

  const url =
    groupKey === "__starlink__"
      ? CELESTRAK_STARLINK_URL
      : `${CELESTRAK_BASE}?GROUP=${groupKey}&FORMAT=tle`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "text/plain",
        "User-Agent": "ProjectZenith/1.0 (Space Education Platform)",
      },
      // Skip Next.js fetch cache for large payloads to avoid the 2 MB limit
      // warning. Small groups keep server-side revalidation (5 min).
      ...(isLarge ? { cache: "no-store" } : { next: { revalidate: 300 } }),
    });

    if (!response.ok) {
      // Starlink fallback: fetch the full active catalog and filter locally
      if (groupKey === "__starlink__") {
        const fallbackUrl = `${CELESTRAK_BASE}?GROUP=active&FORMAT=tle`;
        const fallbackResp = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(20_000),
          headers: {
            Accept: "text/plain",
            "User-Agent": "ProjectZenith/1.0 (Space Education Platform)",
          },
          cache: "no-store",
        });

        if (fallbackResp.ok) {
          const text = await fallbackResp.text();
          const lines = text.split("\n");
          const starlinkLines: string[] = [];
          for (let i = 0; i < lines.length - 2; i++) {
            if (lines[i]?.trim().toUpperCase().includes("STARLINK")) {
              starlinkLines.push(lines[i]!, lines[i + 1]!, lines[i + 2]!);
              i += 2;
            }
          }
          if (starlinkLines.length > 0) {
            return new NextResponse(starlinkLines.join("\n"), {
              status: 200,
              headers: {
                "Content-Type": "text/plain",
                // 5 min fresh, serve stale for up to 2 min while revalidating
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120",
              },
            });
          }
        }
      }

      return NextResponse.json(
        { error: `CelesTrak returned ${response.status}` },
        { status: response.status }
      );
    }

    const text = await response.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        // Larger groups get a longer stale window since they change less often
        "Cache-Control": isLarge
          ? "public, s-maxage=300, stale-while-revalidate=300"
          : "public, s-maxage=180, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch TLE data: ${message}` },
      { status: 502 }
    );
  }
}
