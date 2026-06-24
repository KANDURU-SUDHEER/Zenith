import { NextResponse } from "next/server";

/**
 * Server-side TLE proxy for CelesTrak.
 *
 * Two modes:
 *  GET /api/satellites/tle?all=1      — fetches ALL groups in parallel, returns
 *                                       newline-delimited JSON: one JSON object
 *                                       per line, each { group, category, tle }
 *  GET /api/satellites/tle?group=X    — fetches a single group (legacy / fallback)
 *
 * Using ?all=1 means one serverless function invocation instead of 8, which
 * avoids Netlify's per-function timeout killing individual group fetches.
 */

const CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php";
const CELESTRAK_STARLINK_URL =
  "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=tle";

// All groups to fetch when ?all=1 is used
const ALL_GROUPS: Array<{ group: string; celestrakGroup: string; category: string }> = [
  { group: "stations", celestrakGroup: "stations",  category: "space-stations" },
  { group: "gps-ops",  celestrakGroup: "gps-ops",   category: "gps" },
  { group: "weather",  celestrakGroup: "weather",   category: "weather" },
  { group: "geo",      celestrakGroup: "geo",        category: "communication" },
  { group: "resource", celestrakGroup: "resource",  category: "earth-observation" },
  { group: "science",  celestrakGroup: "science",   category: "scientific" },
  { group: "starlink", celestrakGroup: "__starlink__", category: "starlink" },
  { group: "military", celestrakGroup: "military",  category: "military" },
];

const GROUP_MAP: Record<string, string> = {
  stations:  "stations",
  starlink:  "__starlink__",
  "gps-ops": "gps-ops",
  weather:   "weather",
  geo:       "geo",
  resource:  "resource",
  science:   "science",
  military:  "military",
};

async function fetchOneTLEGroup(celestrakGroup: string): Promise<string> {
  const url =
    celestrakGroup === "__starlink__"
      ? CELESTRAK_STARLINK_URL
      : `${CELESTRAK_BASE}?GROUP=${celestrakGroup}&FORMAT=tle`;

  // 8 second timeout per group — keeps total well under Netlify's 26s limit
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: {
      Accept: "text/plain",
      "User-Agent": "ProjectZenith/1.0 (Space Education Platform)",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    // Starlink-specific fallback via active catalog
    if (celestrakGroup === "__starlink__") {
      const fb = await fetch(`${CELESTRAK_BASE}?GROUP=active&FORMAT=tle`, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: "text/plain", "User-Agent": "ProjectZenith/1.0" },
        cache: "no-store",
      });
      if (fb.ok) {
        const raw = await fb.text();
        const lines = raw.split("\n");
        const out: string[] = [];
        for (let i = 0; i < lines.length - 2; i++) {
          if (lines[i]?.trim().toUpperCase().includes("STARLINK")) {
            out.push(lines[i]!, lines[i + 1]!, lines[i + 2]!);
            i += 2;
          }
        }
        return out.join("\n");
      }
    }
    return "";
  }

  return resp.text();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fetchAll = searchParams.get("all") === "1";

  // ── Mode 1: fetch all groups in one call ─────────────────────────────────
  if (fetchAll) {
    const results = await Promise.allSettled(
      ALL_GROUPS.map(async (g) => {
        const tle = await fetchOneTLEGroup(g.celestrakGroup);
        return { group: g.group, category: g.category, tle };
      })
    );

    // Build newline-delimited JSON — one object per line
    const lines: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.tle.length > 50) {
        lines.push(JSON.stringify(r.value));
      }
    }

    if (lines.length === 0) {
      return NextResponse.json({ error: "All TLE fetches failed" }, { status: 502 });
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        // Cache at CDN for 3 min, serve stale for 2 min during revalidation
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=120",
      },
    });
  }

  // ── Mode 2: single group (legacy) ────────────────────────────────────────
  const group = searchParams.get("group");
  if (!group || !GROUP_MAP[group]) {
    return NextResponse.json({ error: "Invalid group parameter" }, { status: 400 });
  }

  try {
    const text = await fetchOneTLEGroup(GROUP_MAP[group]!);
    if (!text || text.length < 50) {
      return NextResponse.json({ error: "Empty TLE response" }, { status: 502 });
    }
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `TLE fetch failed: ${message}` }, { status: 502 });
  }
}
