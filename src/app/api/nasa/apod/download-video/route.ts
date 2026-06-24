import { NextRequest, NextResponse } from "next/server";

/**
 * Video download proxy for NASA APOD.
 *
 * The client opens this URL in a hidden <a target="_blank">.
 * This route fetches from NASA and immediately streams the response back
 * with Content-Disposition: attachment — the browser's download manager
 * intercepts this and shows Save As without leaving the current page.
 *
 * We do NOT use fetch()+blob() on the client because:
 *  - Large MP4s (10–80 MB) would be held in JS memory before the save dialog
 *  - The fetch itself can time out before the file is fully received
 *
 * This route streams directly (no buffering) so it works for any file size.
 * Vercel's streaming function timeout is 300s on Pro / 60s on Hobby.
 */

const ALLOWED = new Set([
  "apod.nasa.gov",
  "apod.gsfc.nasa.gov",
  "www.nasa.gov",
  "eoimages.gsfc.nasa.gov",
  "science.nasa.gov",
]);

function isAllowed(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    if (protocol !== "https:") return false;
    const h = hostname.toLowerCase();
    for (const a of ALLOWED) {
      if (h === a || h.endsWith(`.${a}`)) return true;
    }
    return false;
  } catch { return false; }
}

function safeFilename(url: string, fallback: string): string {
  try {
    const raw = new URL(url).pathname.split("/").pop() ?? fallback;
    return raw.replace(/[^a-zA-Z0-9._-]/g, "_") || fallback;
  } catch { return fallback; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl  = searchParams.get("url");
  const suggested = searchParams.get("filename") ?? "nasa_apod.mp4";

  if (!videoUrl)       return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!isAllowed(videoUrl)) return NextResponse.json({ error: "URL not permitted" }, { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(videoUrl, {
      // No AbortSignal — let it stream as long as needed.
      // Vercel will close the connection if the platform limit is reached.
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProjectZenith/1.0)",
        Accept: "video/mp4,video/*,*/*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Upstream fetch failed: ${err instanceof Error ? err.message : "network error"}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "video/mp4";
  const filename    = safeFilename(videoUrl, suggested);

  const headers: Record<string, string> = {
    "Content-Type":        contentType,
    // This is the header that makes the browser show Save As
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control":       "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  const cl = upstream.headers.get("content-length");
  if (cl) headers["Content-Length"] = cl;

  // Pipe the upstream ReadableStream directly — never buffer into memory
  return new NextResponse(upstream.body, { status: 200, headers });
}
