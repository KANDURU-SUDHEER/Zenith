"use client";

import { useCallback } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Radio,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSimulationClock,
  type PlaybackSpeed,
} from "@/stores/simulation-clock";
import { useSimulationLoop } from "@/hooks/use-simulation-loop";

// ─── Speed Options ───────────────────────────────────────────────────────────

const SPEEDS: PlaybackSpeed[] = [1, 5, 10, 30, 60, 600, 3600, 86400];

function formatSpeed(s: PlaybackSpeed): string {
  if (s === 1) return "1×";
  if (s === 5) return "5×";
  if (s === 10) return "10×";
  if (s === 30) return "30×";
  if (s === 60) return "1min/s";
  if (s === 600) return "10min/s";
  if (s === 3600) return "1hr/s";
  if (s === 86400) return "1day/s";
  return `${s}×`;
}

// ─── Quick Jump Presets ──────────────────────────────────────────────────────

const PRESETS = [
  { label: "-1d", offset: -86400000 },
  { label: "-1h", offset: -3600000 },
  { label: "+1h", offset: 3600000 },
  { label: "+6h", offset: 21600000 },
  { label: "+1d", offset: 86400000 },
  { label: "+7d", offset: 604800000 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function TimelineBar() {
  // Drive the simulation loop
  useSimulationLoop();

  const {
    simulatedTime,
    playbackState,
    speed,
    isLive,
    pause,
    reverse,
    goLive,
    setSpeed,
    offsetTime,
  } = useSimulationClock();

  const handlePlayPause = useCallback(() => {
    if (playbackState === "playing" || playbackState === "reverse" || playbackState === "live") {
      pause();
    } else {
      // From paused → go back to live
      goLive();
    }
  }, [playbackState, pause, goLive]);

  const handleSpeedUp = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    if (idx < SPEEDS.length - 1) setSpeed(SPEEDS[idx + 1]!);
  }, [speed, setSpeed]);

  const handleSpeedDown = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    if (idx > 0) setSpeed(SPEEDS[idx - 1]!);
  }, [speed, setSpeed]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const formatDate = (d: Date) =>
    d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex h-14 items-center justify-between border-t border-[rgba(255,255,255,0.06)] bg-[#0D0E10] px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] md:h-12 md:px-4">
      {/* Left: UTC Time */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[#111215] border border-[rgba(255,255,255,0.06)] md:flex">
          <Clock className="h-4 w-4 text-[#A8A9AD]" />
        </div>
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-[#FAFAF8] md:text-sm">
            {formatTime(simulatedTime)}
          </span>
          <span className="text-[10px] font-medium text-[#75777D]">
            <span className="hidden sm:inline">{formatDate(simulatedTime)} </span>UTC
          </span>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Quick presets — only on larger screens */}
        <div className="mr-1 hidden items-center gap-1 lg:flex">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => offsetTime(p.offset)}
              className="rounded-lg bg-[rgba(255,255,255,0.03)] px-2 py-1.5 text-xs font-bold text-[#A8A9AD] border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Speed down */}
        <button
          onClick={handleSpeedDown}
          className="hidden rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-[#A8A9AD] border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] sm:flex"
          aria-label="Decrease speed"
          title="Slower"
        >
          <Rewind className="h-4 w-4" />
        </button>

        {/* Skip back */}
        <button
          onClick={() => offsetTime(-1800000)}
          className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-[#A8A9AD] border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
          aria-label="Skip back 30 min"
          title="-30 min"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Reverse */}
        <button
          onClick={reverse}
          className={cn(
            "hidden rounded-lg p-2 border transition-all sm:flex",
            playbackState === "reverse"
              ? "bg-[rgba(255,255,255,0.12)] text-[#FAFAF8] border-[rgba(255,255,255,0.2)]"
              : "bg-[rgba(255,255,255,0.03)] text-[#A8A9AD] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
          )}
          aria-label="Reverse"
          title="Reverse"
        >
          <Rewind className="h-4 w-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          className={cn(
            "rounded-xl p-2.5 border-2 transition-all",
            (playbackState === "playing" || playbackState === "live")
              ? "bg-[#F5F5F4] text-[#111111] border-[#F5F5F4]"
              : "bg-[rgba(255,255,255,0.03)] text-[#A8A9AD] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
          )}
          aria-label={playbackState === "paused" ? "Play" : "Pause"}
        >
          {playbackState === "paused" ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => offsetTime(1800000)}
          className="rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-[#A8A9AD] border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"
          aria-label="Skip forward 30 min"
          title="+30 min"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Speed up */}
        <button
          onClick={handleSpeedUp}
          className="hidden rounded-lg bg-[rgba(255,255,255,0.03)] p-2 text-[#A8A9AD] border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] sm:flex"
          aria-label="Increase speed"
          title="Faster"
        >
          <FastForward className="h-4 w-4" />
        </button>

        {/* Speed indicator */}
        {!isLive && (
          <span className="ml-1 hidden rounded-full bg-[rgba(255,255,255,0.08)] px-2 py-1.5 text-xs font-bold tabular-nums text-[#A8A9AD] border border-[rgba(255,255,255,0.12)] sm:inline-flex md:px-3">
            {formatSpeed(speed)}
          </span>
        )}

        {/* Live button */}
        {!isLive && (
          <button
            onClick={goLive}
            className="ml-1 flex items-center gap-1.5 rounded-xl bg-[#00C16A] px-3 py-2 text-xs font-bold text-white border-2 border-[#00C16A] transition-all duration-150 hover:bg-[#00D975] hover:border-[#00D975] active:scale-95 md:ml-3 md:gap-2 md:px-4"
          >
            <Radio className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">GO LIVE</span>
          </button>
        )}
        {isLive && (
          <div className="ml-1 flex items-center gap-1.5 rounded-xl bg-[rgba(0,193,106,0.12)] px-2 py-2 border border-[rgba(0,193,106,0.3)] md:ml-3 md:px-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00C16A] shadow-[0_0_8px_rgba(0,193,106,0.6)]" />
            <span className="hidden text-xs font-bold text-[#00C16A] sm:inline">LIVE</span>
          </div>
        )}
      </div>

      {/* Right: Local timezone */}
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <span className="font-mono text-xs font-medium text-[#75777D]">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" }).split(" ").pop()}
        </span>
      </div>
    </div>
  );
}
