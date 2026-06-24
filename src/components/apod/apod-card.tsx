"use client";

import { useState, useCallback } from "react";
import {
  ExternalLink,
  Download,
  Share2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Camera,
  Sparkles,
} from "lucide-react";
import { useApod } from "@/hooks/use-apod";
import { showToast, dismissAllToasts } from "@/components/ui/toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extFromUrl(url: string): string {
  const raw = url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg","jpeg","png","gif","webp","tiff"].includes(raw) ? raw : "jpg";
}

async function saveImage(imageUrl: string, filename: string): Promise<void> {
  const proxyUrl =
    `/api/nasa/apod/download` +
    `?url=${encodeURIComponent(imageUrl)}` +
    `&filename=${encodeURIComponent(filename)}`;

  const res = await fetch(proxyUrl);
  if (res.status === 403) { window.open(imageUrl, "_blank", "noopener noreferrer"); return; }
  if (!res.ok) {
    let msg = `Server error (${res.status})`;
    try { const b = await res.json() as { error?: string }; if (b.error) msg = b.error; } catch {/***/}
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

// ─── Component ───────────────────────────────────────────────────────────────

export function APODCard() {
  const { data: apod, isLoading } = useApod();
  const [expanded, setExpanded]   = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);

  const handleShare = useCallback(async () => {
    if (!apod) return;
    const url = apod.hdurl || apod.url;
    if (navigator.share) {
      try { await navigator.share({ title: `NASA APOD: ${apod.title}`, url }); } catch {/***/}
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard", "info");
    }
  }, [apod]);

  const handleDownload = useCallback(async () => {
    if (!apod || isSaving) return;
    setIsSaving(true);
    try {
      const imageUrl = apod.hdurl || apod.url;
      const ext      = extFromUrl(imageUrl);
      showToast("Downloading image…", "info", 20000);
      await saveImage(imageUrl, `NASA_APOD_${apod.date}.${ext}`);
      dismissAllToasts();
      showToast("Image saved!", "success", 3000);
    } catch (err) {
      dismissAllToasts();
      showToast(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error", 4000);
    } finally {
      setIsSaving(false);
    }
  }, [apod, isSaving]);

  const handleHD = useCallback(() => {
    if (apod?.hdurl) window.open(apod.hdurl, "_blank", "noopener");
  }, [apod]);

  if (isLoading) return <APODSkeleton />;
  if (!apod) return null;

  const isVideo = apod.media_type === "video";
  const hasHD   = !!apod.hdurl && !isVideo;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl shadow-black/20 backdrop-blur-sm">

      {/* Media */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-space-950">
        {isVideo ? (
          <iframe
            src={apod.url}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={apod.title}
          />
        ) : (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-950/50 to-purple-950/50" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={apod.url}
              alt={apod.title}
              loading="eager"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          </>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex items-center gap-2 pointer-events-none">
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/10">
            <Sparkles className="h-3 w-3 text-[#A8A9AD]" />
            NASA APOD
          </span>
          {hasHD && (
            <span className="rounded-full bg-indigo-600/60 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
              HD
            </span>
          )}
        </div>

        {/* Title overlay */}
        {!isVideo && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <h3 className="text-lg font-semibold text-white drop-shadow-lg">{apod.title}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{apod.date}</span>
              {apod.copyright && (
                <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{apod.copyright}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1">
          {hasHD && (
            <button onClick={handleHD} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 hover:bg-white/5 hover:text-white/90" title="View HD">
              <Maximize2 className="h-3.5 w-3.5" />HD
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isSaving || isVideo}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 hover:bg-white/5 hover:text-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Save image"
          >
            <Download className={`h-3.5 w-3.5 ${isSaving ? "animate-bounce" : ""}`} />
            {isSaving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 hover:bg-white/5 hover:text-white/90" title="Share">
            <Share2 className="h-3.5 w-3.5" />Share
          </button>
        </div>
        <a
          href="https://apod.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-white/40 hover:bg-white/5 hover:text-white/60"
        >
          <ExternalLink className="h-3 w-3" />NASA
        </a>
      </div>

      {/* Explanation */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className={`text-xs leading-relaxed text-white/60 ${!expanded ? "line-clamp-3" : ""}`}>
          {apod.explanation}
        </p>
        {apod.explanation.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}

function APODSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="aspect-[16/9] w-full animate-pulse bg-gradient-to-br from-indigo-950/30 to-purple-950/30" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-full animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
