"use client";

import {
  useCallback, useEffect, useRef, memo, useState, useMemo,
} from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Lazy-load MissionReportDialog so pdfmake is NOT in the initial bundle.
// It only loads when the user taps "Mission Report".
const MissionReportDialog = dynamic(
  () =>
    import("@/components/mission-report/mission-report-dialog").then(
      (m) => m.MissionReportDialog
    ),
  { ssr: false }
);
import {
  X, ChevronRight,
  // Filters
  Layers, CheckSquare, Square,
  // Search
  Search, Clock, Star,
  // Display
  Orbit, Map, Tag, Zap, Eye,
  // Globe layers
  Wind, Cloud, Globe2,
  // Simulation
  Play, Pause, SkipForward, SkipBack, Radio, Timer,
  // AI
  Sparkles, BarChart3, FileText, Telescope,
  // Preferences
  Settings, Cpu,
  // Icons
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobeStore } from "@/stores/globe-store";
import {
  useRadarFilterStore, RADAR_FILTER_LIST, type RadarFilterKey,
} from "@/stores/radar-filter-store";
import { useSatelliteStore } from "@/stores/satellite-store";
import { useSimulationClock, type PlaybackSpeed } from "@/stores/simulation-clock";
import { useSearchStore } from "@/stores/search-store";
import { useGlobalSearchActions } from "@/hooks/use-global-search-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileToolsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSkyGuide: () => void;
  onOpenTimeline: () => void;
}

type SectionId =
  | "filters"
  | "search"
  | "display"
  | "globe"
  | "simulation"
  | "ai"
  | "prefs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SPEEDS: PlaybackSpeed[] = [1, 5, 10, 30, 60, 600, 3600, 86400];

function formatSpeed(s: PlaybackSpeed): string {
  if (s === 1) return "1×";
  if (s === 60) return "1min/s";
  if (s === 600) return "10min/s";
  if (s === 3600) return "1hr/s";
  if (s === 86400) return "1day/s";
  return `${s}×`;
}

function formatSimTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  id, label, icon, isOpen, onToggle, badge,
}: {
  id: SectionId; label: string; icon: React.ReactNode;
  isOpen: boolean; onToggle: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.06)]"
      aria-expanded={isOpen}
      aria-controls={`section-${id}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] text-[#A8A9AD]">
        {icon}
      </span>
      <span className="flex-1 text-left text-sm font-semibold text-[#FAFAF8]">{label}</span>
      {badge && (
        <span className="rounded-full bg-[rgba(0,193,106,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#00C16A]">
          {badge}
        </span>
      )}
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 text-[#75777D] transition-transform duration-200",
          isOpen && "rotate-90"
        )}
      />
    </button>
  );
}

// ─── Touch-friendly toggle button ────────────────────────────────────────────

function ToggleRow({
  icon, label, active, onToggle, accent = "#A8A9AD",
}: {
  icon: React.ReactNode; label: string;
  active: boolean; onToggle: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        active
          ? "bg-[rgba(255,255,255,0.07)] ring-1 ring-[rgba(255,255,255,0.1)]"
          : "hover:bg-[rgba(255,255,255,0.04)]"
      )}
      aria-pressed={active}
    >
      <span style={{ color: active ? accent : "#75777D" }}>{icon}</span>
      <span className={cn("flex-1 text-left text-sm", active ? "font-medium text-[#FAFAF8]" : "text-[#A8A9AD]")}>
        {label}
      </span>
      <span
        className={cn(
          "h-5 w-9 rounded-full transition-colors",
          active ? "bg-[#00C16A]" : "bg-[rgba(255,255,255,0.1)]"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "block h-5 w-5 translate-x-0 rounded-full bg-white shadow transition-transform",
            active && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}



// ─── Section: Satellite Filters ───────────────────────────────────────────────

const FILTER_ICONS: Record<RadarFilterKey, string> = {
  sun: "☀", naturalSatellites: "🌙", planets: "🪐",
  iss: "🛰", starlink: "✦", gps: "◎",
  weather: "☁", communication: "📡", earthObservation: "🌍",
  scientific: "⬡", spaceStations: "🔗", military: "⬟",
};

const GLOBE_KEY_MAP: Record<string, string> = {
  iss: "iss", starlink: "starlink", gps: "gps", weather: "weather",
  communication: "communication", earthObservation: "earthObservation",
  scientific: "scientific", spaceStations: "spaceStations", military: "military",
};

const SatelliteFiltersSection = memo(function SatelliteFiltersSection() {
  const filters = useRadarFilterStore((s) => s.filters);
  const storeCounts = useSatelliteStore((s) => s.categoryCounts);
  const toggleRadarFilter = useRadarFilterStore((s) => s.toggleFilter);
  const setAllRadarFilters = useRadarFilterStore((s) => s.setAllFilters);
  const setGlobeFilter = useSatelliteStore((s) => s.setFilter);
  const setAllGlobeFilters = useSatelliteStore((s) => s.setAllFilters);

  const handleToggle = useCallback((key: string) => {
    toggleRadarFilter(key as RadarFilterKey);
    const gk = GLOBE_KEY_MAP[key];
    if (gk) setGlobeFilter(gk, !filters[key]);
  }, [toggleRadarFilter, setGlobeFilter, filters]);

  return (
    <div>
      {/* Select All / Clear All */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => { setAllRadarFilters(true); setAllGlobeFilters(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-xs font-medium text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)]"
        >
          <CheckSquare className="h-3.5 w-3.5" /> All
        </button>
        <button
          onClick={() => { setAllRadarFilters(false); setAllGlobeFilters(false); }}
          className="flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-xs font-medium text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)]"
        >
          <Square className="h-3.5 w-3.5" /> None
        </button>
        <span className="ml-auto text-[10px] text-[#75777D]">
          {RADAR_FILTER_LIST.filter((f) => filters[f.key]).length}/{RADAR_FILTER_LIST.length} active
        </span>
      </div>

      {/* Filter rows */}
      <div role="group" aria-label="Satellite category filters" className="space-y-0.5">
        {RADAR_FILTER_LIST.map((f) => {
          const enabled = !!filters[f.key];
          const count = storeCounts[f.key] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => handleToggle(f.key)}
              role="checkbox"
              aria-checked={enabled}
              className={cn(
                "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                enabled ? "hover:bg-[rgba(255,255,255,0.05)]" : "opacity-50 hover:opacity-70 hover:bg-[rgba(255,255,255,0.03)]"
              )}
            >
              <span className="w-5 shrink-0 text-center text-base leading-none">
                {FILTER_ICONS[f.key]}
              </span>
              <span className={cn("flex-1 text-left text-sm", enabled ? "font-medium text-[#FAFAF8]" : "text-[#75777D]")}>
                {f.label}
              </span>
              {count > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-[#75777D]">{count}</span>
              )}
              <span
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border",
                  enabled
                    ? "border-[rgba(0,193,106,0.6)] bg-[rgba(0,193,106,0.2)]"
                    : "border-[rgba(255,255,255,0.15)] bg-transparent"
                )}
                aria-hidden="true"
              >
                {enabled && (
                  <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#00C16A" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});


// ─── Section: Search ──────────────────────────────────────────────────────────

const SearchSection = memo(function SearchSection({ onClose }: { onClose: () => void }) {
  const [localQuery, setLocalQuery] = useState("");
  const recentSearches = useSearchStore((s) => s.recentSearches);
  const searchFavorites = useSearchStore((s) => s.favorites);
  const { handleResultSelect } = useGlobalSearchActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback((result: Parameters<typeof handleResultSelect>[0]) => {
    handleResultSelect(result);
    setLocalQuery("");
    onClose();
  }, [handleResultSelect, onClose]);

  const displayed = useMemo(() => {
    if (!localQuery.trim()) return recentSearches.slice(0, 6);
    const q = localQuery.toLowerCase();
    return recentSearches.filter((r) =>
      r.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [localQuery, recentSearches]);

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex items-center gap-2 rounded-xl bg-[rgba(255,255,255,0.05)] px-3 py-2.5 ring-1 ring-[rgba(255,255,255,0.08)] focus-within:ring-[rgba(0,193,106,0.3)]">
        <Search className="h-4 w-4 shrink-0 text-[#75777D]" />
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Satellite name, NORAD ID…"
          className="flex-1 bg-transparent text-sm text-[#FAFAF8] placeholder:text-[#75777D] focus:outline-none"
          aria-label="Search satellites"
        />
        {localQuery && (
          <button onClick={() => setLocalQuery("")} className="text-[#75777D] hover:text-[#FAFAF8]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Favorites */}
      {searchFavorites.length > 0 && !localQuery && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#75777D]">
            <Star className="h-3 w-3" /> Favorites
          </p>
          <div className="space-y-0.5">
            {searchFavorites.slice(0, 4).map((fav) => (
              <button
                key={fav.id}
                onClick={() => handleSelect(fav)}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.05)]"
              >
                <Star className="h-3.5 w-3.5 shrink-0 text-[#F4A524]" />
                <span className="flex-1 truncate text-sm text-[#FAFAF8]">{fav.name}</span>
                {fav.subtitle && (
                  <span className="shrink-0 text-[10px] text-[#75777D]">{fav.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent / filtered results */}
      {displayed.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[#75777D]">
            <Clock className="h-3 w-3" /> {localQuery ? "Matches" : "Recent"}
          </p>
          <div className="space-y-0.5">
            {displayed.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.05)]"
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#75777D]" />
                <span className="flex-1 truncate text-sm text-[#FAFAF8]">{r.name}</span>
                {r.subtitle && (
                  <span className="shrink-0 text-[10px] text-[#75777D]">{r.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {displayed.length === 0 && !searchFavorites.length && (
        <p className="py-4 text-center text-xs text-[#75777D]">
          Use the search bar above the globe for full results
        </p>
      )}
    </div>
  );
});


// ─── Section: Display ─────────────────────────────────────────────────────────

// Display toggles live in a local ref-based store so simulation ticks can't
// reset them. They are persisted to localStorage on change.

const DISPLAY_KEY = "zenith_mobile_display";

type DisplayState = {
  orbitPaths: boolean;
  groundTracks: boolean;
  labels: boolean;
  velocityVectors: boolean;
  constellationLines: boolean;
};

const defaultDisplay: DisplayState = {
  orbitPaths: true,
  groundTracks: false,
  labels: true,
  velocityVectors: false,
  constellationLines: false,
};

function loadDisplay(): DisplayState {
  if (typeof window === "undefined") return defaultDisplay;
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    return raw ? { ...defaultDisplay, ...(JSON.parse(raw) as Partial<DisplayState>) } : defaultDisplay;
  } catch { return defaultDisplay; }
}

function saveDisplay(d: DisplayState) {
  try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(d)); } catch {/**/}
}

const DisplaySection = memo(function DisplaySection() {
  const [display, setDisplay] = useState<DisplayState>(loadDisplay);

  const toggle = useCallback((key: keyof DisplayState) => {
    setDisplay((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveDisplay(next);
      return next;
    });
  }, []);

  const rows: { key: keyof DisplayState; label: string; icon: React.ReactNode }[] = [
    { key: "orbitPaths",       label: "Orbit Paths",         icon: <Orbit className="h-4 w-4" /> },
    { key: "groundTracks",     label: "Ground Tracks",       icon: <Map className="h-4 w-4" /> },
    { key: "labels",           label: "Satellite Labels",    icon: <Tag className="h-4 w-4" /> },
    { key: "velocityVectors",  label: "Velocity Vectors",    icon: <Zap className="h-4 w-4" /> },
    { key: "constellationLines", label: "Constellation Lines", icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <ToggleRow
          key={r.key}
          icon={r.icon}
          label={r.label}
          active={display[r.key]}
          onToggle={() => toggle(r.key)}
          accent="#00C16A"
        />
      ))}
    </div>
  );
});


// ─── Section: Globe Layers ────────────────────────────────────────────────────

const GlobeLayersSection = memo(function GlobeLayersSection() {
  const isReady = useGlobeStore((s) => s.isReady);
  const lightingEnabled = useGlobeStore((s) => s.lightingEnabled);
  const setLightingEnabled = useGlobeStore((s) => s.setLightingEnabled);
  const cloudsEnabled = useGlobeStore((s) => s.cloudsEnabled);
  const setCloudsEnabled = useGlobeStore((s) => s.setCloudsEnabled);
  const atmosphereEnabled = useGlobeStore((s) => s.atmosphereEnabled);
  const setAtmosphereEnabled = useGlobeStore((s) => s.setAtmosphereEnabled);

  if (!isReady) {
    return <p className="py-3 text-center text-xs text-[#75777D]">Globe loading…</p>;
  }

  return (
    <div className="space-y-1">
      <ToggleRow
        icon={<Sun className="h-4 w-4" />}
        label="Day / Night Lighting"
        active={lightingEnabled}
        onToggle={() => setLightingEnabled(!lightingEnabled)}
        accent="#F4A524"
      />
      <ToggleRow
        icon={<Cloud className="h-4 w-4" />}
        label="Clouds"
        active={cloudsEnabled}
        onToggle={() => setCloudsEnabled(!cloudsEnabled)}
        accent="#A8A9AD"
      />
      <ToggleRow
        icon={<Wind className="h-4 w-4" />}
        label="Atmosphere"
        active={atmosphereEnabled}
        onToggle={() => setAtmosphereEnabled(!atmosphereEnabled)}
        accent="#60a5fa"
      />
    </div>
  );
});


// ─── Section: Simulation ──────────────────────────────────────────────────────
// Uses fine-grained selectors so simulation ticks only re-render the live
// time display, not the whole section.

const SimTimeDisplay = memo(function SimTimeDisplay() {
  const simulatedTime = useSimulationClock((s) => s.simulatedTime);
  const isLive = useSimulationClock((s) => s.isLive);
  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.04)] px-4 py-3 ring-1 ring-[rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#75777D]">
        {isLive ? "Live UTC" : "Simulated UTC"}
      </p>
      <p className="mt-1 font-mono text-lg font-bold text-[#FAFAF8] tabular-nums" suppressHydrationWarning>
        {formatSimTime(simulatedTime)}
      </p>
      {isLive && (
        <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#00C16A]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00C16A]" />
          LIVE
        </span>
      )}
    </div>
  );
});

const SimulationSection = memo(function SimulationSection({ onOpenTimeline, onClose }: {
  onOpenTimeline: () => void; onClose: () => void;
}) {
  const playbackState = useSimulationClock((s) => s.playbackState);
  const speed = useSimulationClock((s) => s.speed);
  const isLive = useSimulationClock((s) => s.isLive);
  const { pause, play, goLive, setSpeed, offsetTime } = useSimulationClock();

  const isPlaying = playbackState === "playing" || playbackState === "live";

  const handleSpeedDown = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    if (idx > 0) setSpeed(SPEEDS[idx - 1]!);
  }, [speed, setSpeed]);

  const handleSpeedUp = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    if (idx < SPEEDS.length - 1) setSpeed(SPEEDS[idx + 1]!);
  }, [speed, setSpeed]);

  return (
    <div className="space-y-3">
      <SimTimeDisplay />

      {/* Playback controls */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => offsetTime(-1_800_000)}
          className="flex min-h-[44px] items-center justify-center rounded-xl bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
          aria-label="Skip back 30 min"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className={cn(
            "col-span-2 flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors active:scale-95",
            isPlaying
              ? "bg-[#FAFAF8] text-[#111111]"
              : "bg-[rgba(255,255,255,0.08)] text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.12)]"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying
            ? <><Pause className="h-4 w-4" /> Pause</>
            : <><Play className="h-4 w-4" /> Play</>}
        </button>
        <button
          onClick={() => offsetTime(1_800_000)}
          className="flex min-h-[44px] items-center justify-center rounded-xl bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
          aria-label="Skip forward 30 min"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Speed selector */}
      {!isLive && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeedDown}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
            aria-label="Slower"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-1 justify-center rounded-xl bg-[rgba(255,255,255,0.05)] px-3 py-2">
            <span className="font-mono text-sm font-bold text-[#FAFAF8]">{formatSpeed(speed)}</span>
          </div>
          <button
            onClick={handleSpeedUp}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
            aria-label="Faster"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Go Live / Timeline */}
      <div className="grid grid-cols-2 gap-2">
        {!isLive && (
          <button
            onClick={goLive}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#00C16A] text-sm font-bold text-white active:scale-95"
          >
            <Radio className="h-4 w-4" /> Go Live
          </button>
        )}
        <button
          onClick={() => { onOpenTimeline(); onClose(); }}
          className={cn(
            "flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[rgba(255,255,255,0.06)] text-sm font-medium text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.09)] active:scale-95",
            isLive && "col-span-2"
          )}
        >
          <Timer className="h-4 w-4" /> Timeline
        </button>
      </div>
    </div>
  );
});


// ─── Section: AI Tools ────────────────────────────────────────────────────────

const AIToolsSection = memo(function AIToolsSection({
  onOpenSkyGuide,
  onClose,
}: { onOpenSkyGuide: () => void; onClose: () => void }) {
  // Mission Report has its own local open state so it mounts the dialog
  // directly without routing through the AI Sky Guide.
  const [reportOpen, setReportOpen] = useState(false);

  const tools = [
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: "AI Sky Guide",
      desc: "Intelligent sky insights",
      color: "#00C16A",
      onClick: () => { onOpenSkyGuide(); onClose(); },
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: "Visibility Prediction",
      desc: "When satellites pass over",
      color: "#60a5fa",
      onClick: () => { onOpenSkyGuide(); onClose(); },
    },
    {
      icon: <Telescope className="h-4 w-4" />,
      label: "Pass Prediction",
      desc: "Overhead pass times",
      color: "#a78bfa",
      onClick: () => { onOpenSkyGuide(); onClose(); },
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Orbital Analytics",
      desc: "Trajectory & coverage",
      color: "#F4A524",
      onClick: () => { onOpenSkyGuide(); onClose(); },
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Mission Report",
      desc: "Generate PDF report",
      color: "#2dd4bf",
      // Close the sidebar and open the mission report dialog directly
      onClick: () => { onClose(); setReportOpen(true); },
    },
  ];

  return (
    <>
      <div className="space-y-2">
        {tools.map((t) => (
          <button
            key={t.label}
            onClick={t.onClick}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.03)] px-4 py-3 text-left ring-1 ring-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.98]"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: t.color + "18", color: t.color }}
            >
              {t.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#FAFAF8]">{t.label}</p>
              <p className="text-[11px] text-[#75777D]">{t.desc}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#75777D]" />
          </button>
        ))}
      </div>

      {/* Mission Report dialog — rendered outside the sidebar so it overlays
          the full screen correctly even after the sidebar is closed.          */}
      <MissionReportDialog
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
});


// ─── Section: Preferences ─────────────────────────────────────────────────────

const PREFS_KEY = "zenith_mobile_prefs";

type PrefsState = {
  units: "metric" | "imperial";
  coordFormat: "decimal" | "dms";
  performanceMode: boolean;
  notifications: boolean;
};

const defaultPrefs: PrefsState = {
  units: "metric",
  coordFormat: "decimal",
  performanceMode: false,
  notifications: true,
};

function loadPrefs(): PrefsState {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPrefs, ...(JSON.parse(raw) as Partial<PrefsState>) } : defaultPrefs;
  } catch { return defaultPrefs; }
}

function savePrefs(p: PrefsState) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {/**/}
}

const PreferencesSection = memo(function PreferencesSection() {
  const [prefs, setPrefs] = useState<PrefsState>(loadPrefs);

  const update = useCallback(<K extends keyof PrefsState>(key: K, value: PrefsState[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Units */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#75777D]">Units</p>
        <div className="grid grid-cols-2 gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              onClick={() => update("units", u)}
              className={cn(
                "min-h-[44px] rounded-xl py-2.5 text-sm font-semibold capitalize transition-all",
                prefs.units === u
                  ? "bg-[#FAFAF8] text-[#111111]"
                  : "bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)]"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinate Format */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#75777D]">
          Coordinate Format
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "decimal", label: "Decimal" },
            { id: "dms", label: "DMS" },
          ] as const).map((c) => (
            <button
              key={c.id}
              onClick={() => update("coordFormat", c.id)}
              className={cn(
                "min-h-[44px] rounded-xl py-2.5 text-sm font-semibold transition-all",
                prefs.coordFormat === c.id
                  ? "bg-[#FAFAF8] text-[#111111]"
                  : "bg-[rgba(255,255,255,0.05)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.08)]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-1">
        <ToggleRow
          icon={<Cpu className="h-4 w-4" />}
          label="Performance Mode"
          active={prefs.performanceMode}
          onToggle={() => update("performanceMode", !prefs.performanceMode)}
          accent="#F4A524"
        />
        <ToggleRow
          icon={<Radio className="h-4 w-4" />}
          label="Notifications"
          active={prefs.notifications}
          onToggle={() => update("notifications", !prefs.notifications)}
          accent="#00C16A"
        />
      </div>
    </div>
  );
});


// ─── Sidebar content — permanently mounted ────────────────────────────────────
//
// SidebarContent is ALWAYS mounted regardless of isOpen.
// It is translated off-screen when closed using CSS transform.
// This means:
//   • Scroll position is preserved (no unmount/remount)
//   • Section expanded state is preserved
//   • Simulation ticks never remount anything
//   • Each section is memo'd separately — only changed data re-renders
//
// The backdrop is still AnimatePresence-driven (it IS unmounted when closed,
// which is fine — it has no scroll state to preserve).

const SidebarContent = memo(function SidebarContent({
  onClose,
  onOpenSkyGuide,
  onOpenTimeline,
}: {
  onClose: () => void;
  onOpenSkyGuide: () => void;
  onOpenTimeline: () => void;
}) {
  // ── Scroll preservation ───────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = scrollPosRef.current;
    const onScroll = () => { scrollPosRef.current = el.scrollTop; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []); // empty dep — only on mount, never resets

  // ── One-open-at-a-time accordion ─────────────────────────────────────
  const [openSection, setOpenSection] = useState<SectionId>("filters");

  const toggle = useCallback((id: SectionId) => {
    setOpenSection((prev) => (prev === id ? prev : id));
  }, []);

  const SECTIONS: Array<{
    id: SectionId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    { id: "filters",    label: "Satellite Filters",  icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "search",     label: "Search",             icon: <Search className="h-3.5 w-3.5" /> },
    { id: "display",    label: "Display",            icon: <Eye className="h-3.5 w-3.5" /> },
    { id: "globe",      label: "Globe Layers",       icon: <Globe2 className="h-3.5 w-3.5" /> },
    { id: "simulation", label: "Simulation",         icon: <Timer className="h-3.5 w-3.5" /> },
    { id: "ai",         label: "AI Tools",           icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "prefs",      label: "Preferences",        icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      {/* Static header — never re-renders */}
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#111215] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Layers className="h-4 w-4 text-[#75777D]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#75777D]">
            Controls
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-xl text-[#75777D] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
          aria-label="Close controls panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable accordion — single scroll container, no nested scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
      >
        <div className="p-3 pb-8 space-y-1">
          {SECTIONS.map((sec) => {
            const isExpanded = openSection === sec.id;
            return (
              <div
                key={sec.id}
                className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]"
              >
                <SectionHeader
                  id={sec.id}
                  label={sec.label}
                  icon={sec.icon}
                  isOpen={isExpanded}
                  onToggle={() => toggle(sec.id)}
                  badge={sec.badge}
                />
                {/* Animate height open/close — content stays mounted */}
                <motion.div
                  initial={false}
                  animate={{ height: isExpanded ? "auto" : 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="overflow-hidden"
                  id={`section-${sec.id}`}
                  aria-hidden={!isExpanded}
                >
                  <div className="border-t border-[rgba(255,255,255,0.04)] px-3 py-3">
                    {sec.id === "filters"    && <SatelliteFiltersSection />}
                    {sec.id === "search"     && <SearchSection onClose={onClose} />}
                    {sec.id === "display"    && <DisplaySection />}
                    {sec.id === "globe"      && <GlobeLayersSection />}
                    {sec.id === "simulation" && (
                      <SimulationSection onOpenTimeline={onOpenTimeline} onClose={onClose} />
                    )}
                    {sec.id === "ai"         && (
                      <AIToolsSection onOpenSkyGuide={onOpenSkyGuide} onClose={onClose} />
                    )}
                    {sec.id === "prefs"      && <PreferencesSection />}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
});


// ─── Main export — shell with permanent-mount architecture ───────────────────
//
// The backdrop uses AnimatePresence (it's lightweight and has no state).
// SidebarContent is ALWAYS rendered but translated off-screen when closed —
// this is the key to never losing scroll position or section state.

export const MobileToolsSidebar = memo(function MobileToolsSidebar({
  isOpen,
  onClose,
  onOpenSkyGuide,
  onOpenTimeline,
}: MobileToolsSidebarProps) {
  const handleBackdrop = useCallback(() => onClose(), [onClose]);

  // Prevent body scroll while sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop — touch-action:none prevents globe interactions bleeding through */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="tools-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            style={{ touchAction: "none" }}
            onClick={handleBackdrop}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel — ALWAYS mounted, translated off-screen when closed.
          Stops above the bottom nav bar so last section items are reachable. */}
      <motion.div
        animate={{ x: isOpen ? 0 : "100%" }}
        initial={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="fixed right-0 top-0 z-50 flex flex-col overflow-hidden rounded-l-2xl border-l border-[rgba(255,255,255,0.06)] bg-[#0D0E10]/97 shadow-[-4px_0_40px_rgba(0,0,0,0.65)]"
        style={{
          width: "min(88vw, 320px)",
          willChange: "transform",
          pointerEvents: isOpen ? "auto" : "none",
          // Stop above nav bar so scroll content is never hidden behind it
          bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Controls"
        aria-hidden={!isOpen}
      >
        <SidebarContent
          onClose={onClose}
          onOpenSkyGuide={onOpenSkyGuide}
          onOpenTimeline={onOpenTimeline}
        />
      </motion.div>
    </>
  );
});
