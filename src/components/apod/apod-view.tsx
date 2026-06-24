"use client";

import { useState, useCallback } from "react";
import {
  ExternalLink,
  Download,
  Share2,
  Maximize2,
  Calendar,
  Camera,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useApod } from "@/hooks/use-apod";
import { LastUpdated } from "@/components/status/LastUpdated";
import { showToast, dismissAllToasts } from "@/components/ui/toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?.[1] ?? null;
}

function extFromUrl(url: string): string {
  const raw = url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg","jpeg","png","gif","webp","tiff","mp4","webm","mov"].includes(raw) ? raw : "jpg";
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov|ogv|mpeg|mpg)(\?|$)/i.test(url);
}

/**
 * Download an image through the server proxy.
 * proxy → streams back with Content-Disposition: attachment
 * client → blob URL → named <a download> click
 */
async function saveImage(imageUrl: string, filename: string): Promise<void> {
  const proxyUrl = `/api/nasa/apod/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
  const res = await fetch(proxyUrl);

  if (res.status === 403) {
    // Hostname not in allowlist — open in new tab as fallback
    window.open(imageUrl, "_blank", "noopener noreferrer");
    return;
  }
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch { /**/ }
    throw new Error(msg);
  }

  const blob   = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = objUrl;
  a.download   = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
}

/**
 * Download a video by opening the proxy URL in a new tab.
 *
 * Why <a target="_blank"> and NOT:
 *   fetch()+blob()      → times out for large files in JS memory
 *   window.location.href → navigates the current page away (ERR_FAILED)
 *   Service Worker      → CORS blocks cross-origin fetch from SW
 *
 * The proxy route returns Content-Disposition: attachment.
 * Browsers auto-trigger Save As for attachment responses and close
 * the blank tab — the user never sees the new tab.
 */
function saveVideo(videoUrl: string, filename: string): void {
  const proxyUrl = `/api/nasa/apod/download-video?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;
  const a        = document.createElement("a");
  a.href         = proxyUrl;
  a.target       = "_blank";
  a.rel          = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function APODView() {
  const { data: apod, isLoading, refetch, dataUpdatedAt } = useApod();
  const [imageLoaded, setImageLoaded]   = useState(false);
  const [fullscreen, setFullscreen]     = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  const handleShare = useCallback(async () => {
    if (!apod) return;
    const shareUrl = apod.hdurl || apod.url;
    if (navigator.share) {
      try { await navigator.share({ title: `NASA APOD: ${apod.title}`, url: shareUrl }); }
      catch { /**/ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard", "info");
    }
  }, [apod]);

  const handleDownload = useCallback(async () => {
    if (!apod || isSaving) return;
    setIsSaving(true);

    try {
      const isVideo = apod.media_type === "video";

      if (isVideo) {
        // YouTube → save thumbnail (can't download YT videos)
        const ytId = getYouTubeId(apod.url);
        if (ytId) {
          showToast("Saving thumbnail…", "info", 15000);
          await saveImage(
            `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
            `NASA_APOD_${apod.date}_thumbnail.jpg`
          );
          dismissAllToasts();
          showToast("Thumbnail saved!", "success", 3000);
          return;
        }

        // Vimeo → save thumbnail
        const vimeoId = getVimeoId(apod.url);
        if (vimeoId) {
          showToast("Fetching thumbnail…", "info", 10000);
          let thumbUrl: string | null = null;
          try {
            const r = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}`);
            if (r.ok) { const d = await r.json() as { thumbnail_url?: string }; thumbUrl = d.thumbnail_url ?? null; }
          } catch { /**/ }
          if (thumbUrl) {
            await saveImage(thumbUrl, `NASA_APOD_${apod.date}_thumbnail.jpg`);
            dismissAllToasts();
            showToast("Thumbnail saved!", "success", 3000);
          } else {
            dismissAllToasts();
            showToast("Could not retrieve thumbnail", "error", 4000);
          }
          return;
        }

        // Direct MP4/WebM → proxy download via hidden anchor (new tab)
        if (isVideoFile(apod.url)) {
          showToast("Starting video download…", "info", 5000);
          saveVideo(apod.url, `NASA_APOD_${apod.date}.${extFromUrl(apod.url)}`);
          dismissAllToasts();
          return;
        }

        // Unknown video type → open on NASA
        window.open(apod.url, "_blank", "noopener noreferrer");
        return;
      }

      // Image → proxy → blob → named save
      const imageUrl = apod.hdurl || apod.url;
      showToast(apod.hdurl ? "Downloading HD image…" : "Downloading image…", "info", 30000);
      await saveImage(imageUrl, `NASA_APOD_${apod.date}.${extFromUrl(imageUrl)}`);
      dismissAllToasts();
      showToast("Image saved!", "success", 3000);

    } catch (err) {
      dismissAllToasts();
      showToast(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error", 5000);
    } finally {
      setIsSaving(false);
    }
  }, [apod, isSaving]);

  const handleHD = useCallback(() => {
    if (apod?.hdurl) window.open(apod.hdurl, "_blank", "noopener");
  }, [apod]);

  if (isLoading) return <APODSkeleton />;
  if (!apod)     return null;

  const isVideo       = apod.media_type === "video";
  const hasHD         = !!apod.hdurl && !isVideo;
  const isEmbeddable  = isVideo && (
    apod.url.includes("youtube.com/embed") ||
    apod.url.includes("youtu.be") ||
    apod.url.includes("vimeo.com") ||
    apod.url.includes("player.vimeo.com")
  );
  const isDirectVideo = isVideo && !isEmbeddable && isVideoFile(apod.url);

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#0D0E10]">

      {/* Fullscreen overlay */}
      {fullscreen && !isVideo && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={apod.hdurl || apod.url}
            alt={apod.title}
            className="max-h-full max-w-full object-contain p-4"
          />
          <p className="absolute bottom-6 text-sm text-white/50">Click anywhere to close</p>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] ring-1 ring-[rgba(255,255,255,0.08)]">
              <Sparkles className="h-5 w-5 text-[#A8A9AD]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white sm:text-lg">
                Astronomy Picture of the Day
              </h1>
              <p className="text-xs text-white/40">
                NASA ·{" "}
                <LastUpdated timestamp={dataUpdatedAt} prefix="Fetched" className="inline text-white/40" />
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-lg p-2 text-white/30 hover:bg-white/5 hover:text-white/60"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Media card */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl shadow-black/40">
          <div
            className={`relative aspect-[16/9] w-full overflow-hidden bg-[#111215] ${!isVideo ? "cursor-zoom-in" : ""}`}
            onClick={() => !isVideo && setFullscreen(true)}
          >
            {isEmbeddable ? (
              <iframe
                src={apod.url}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={apod.title}
              />
            ) : isDirectVideo ? (
              /* Direct MP4/WebM — native browser player, streams properly */
              <video
                src={apod.url}
                className="h-full w-full"
                controls
                playsInline
                preload="metadata"
                style={{ background: "#000" }}
              >
                <track kind="captions" />
              </video>
            ) : isVideo ? (
              /* Unrecognised video type — link to NASA */
              <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0a0b0e] p-8 text-center">
                <ExternalLink className="h-10 w-10 text-white/30" />
                <p className="text-sm font-medium text-white/80">Today&apos;s APOD is a video</p>
                <a
                  href={apod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-white/80 ring-1 ring-white/10 transition hover:bg-white/[0.12] hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Watch on NASA.gov
                </a>
              </div>
            ) : (
              /* Image */
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-950/50 to-purple-950/50" />
                )}
                {/* Plain <img> — avoids next/image domain restrictions and
                    proxy overhead for cross-origin NASA images */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apod.url}
                  alt={apod.title}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setImageLoaded(true)}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              </>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex items-center gap-2 pointer-events-none">
              <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md ring-1 ring-white/10">
                <Sparkles className="h-3.5 w-3.5 text-[#A8A9AD]" />
                NASA APOD
              </span>
              {hasHD   && <span className="rounded-full bg-indigo-600/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">HD</span>}
              {isVideo && <span className="rounded-full bg-rose-600/70   px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">VIDEO</span>}
            </div>

            {/* Title overlay — images only */}
            {!isVideo && (
              <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                <h2 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">{apod.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/60">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{apod.date}</span>
                  {apod.copyright && (
                    <span className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" />© {apod.copyright}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-3 py-2 sm:px-5 sm:py-3">
            <div className="flex flex-wrap items-center gap-0.5">
              {hasHD && (
                <button onClick={handleHD} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white sm:px-3">
                  <Maximize2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">View HD</span>
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed sm:px-3"
              >
                <Download className={`h-3.5 w-3.5 ${isSaving ? "animate-bounce" : ""}`} />
                <span className="hidden sm:inline">{isSaving ? "Saving…" : "Save"}</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white sm:px-3">
                <Share2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Share</span>
              </button>
            </div>
            <a
              href="https://apod.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-white/40 hover:bg-white/5 hover:text-white/60 sm:px-3"
            >
              <ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">nasa.gov</span>
            </a>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-semibold text-white/80">
            {isVideo ? "About This Video" : "About This Image"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{apod.explanation}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            NASA&apos;s Astronomy Picture of the Day has published a new image every day since June 16, 1995,
            with a brief explanation written by a professional astronomer.
          </p>
          {apod.copyright && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-xs text-white/40">
                <span className="font-medium text-white/60">Credit & Copyright:</span> {apod.copyright}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function APODSkeleton() {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#0D0E10]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-white/5" />
        <div className="mt-6 aspect-[16/9] w-full animate-pulse rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/30" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}
