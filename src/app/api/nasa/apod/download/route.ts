import { NextRequest, NextResponse } from "next/server";

/**
 * Image download proxy for NASA APOD.
 * Streams the image back with Content-Disposition: attachment.
 * Images only — videos use /api/nasa/apod/download-video.
 */

const ALLOWED_HOSTNAMES = new Set([
  "apod.nasa.gov",
  "apod.gsfc.nasa.gov",
  "www.nasa.gov",
  "images-assets.nasa.gov",
  "eoimages.gsfc.nasa.gov",
  "hubblesite.org",
  "imgsrc.hubblesite.org",
  "esahubble.org",
  "www.esa.int",
  "esawebb.org",
  "webbtelescope.org",
  "stsci.edu",
  "upload.wikimedia.org",
  "en.wikipedia.org",
  "img.youtube.com",
  "i.ytimg.com",
  "i.vimeocdn.com",
  "cdn.eso.org",
  "www.eso.org",
  "noirlab.edu",
  "science.nasa.gov",
]);

function isAllowed(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    if (protocol !== "https:") return false;
    const host = hostname.toLowerCase();
    for (const a of ALLOWED_HOSTNAMES) {
      if (host === a || host.endsWith(`.${a}`)) return true;
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
  const mediaUrl  = searchParams.get("url");
  const suggested = searchParams.get("filename") ?? "nasa_apod.jpg";

  if (!mediaUrl)          return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!isAllowed(mediaUrl)) return NextResponse.json({ error: "URL not permitted" }, { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(mediaUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProjectZenith/1.0; +https://project-zenith.vercel.app)",
        Accept: "image/*,*/*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch failed: ${err instanceof Error ? err.message : "network error"}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }

  const filename = safeFilename(mediaUrl, suggested);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  };
  const cl = upstream.headers.get("content-length");
  if (cl) headers["Content-Length"] = cl;

  return new NextResponse(upstream.body, { status: 200, headers });
}
