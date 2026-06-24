"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocationStore } from "@/stores/location-store";
import type { CelestialObject } from "@/types";
import { useISSTracker } from "@/hooks/use-iss-tracker";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import { useOrbitalData } from "@/providers/orbital-engine-provider";
import { computeLookAngles } from "@/services/visibility-engine";
import {
  useRadarFilterStore,
  objectToFilterKey,
  type RadarFilterKey,
} from "@/stores/radar-filter-store";
import { useSatelliteStore } from "@/stores/satellite-store";
import { useSearchStore } from "@/stores/search-store";
import { FileText } from "lucide-react";
import { MissionReportDialog } from "@/components/mission-report/mission-report-dialog";

// ─── Planet Rendering Definitions ────────────────────────────────────────────

interface PlanetStyle {
  baseColor: string;
  highlight: string;
  shadow: string;
  size: number; // base pixel size
  hasRing?: boolean;
  ringColor?: string;
}

const PLANET_STYLES: Record<string, PlanetStyle> = {
  sun: { baseColor: "#f59e0b", highlight: "#fcd34d", shadow: "#b45309", size: 18 },
  moon: { baseColor: "#9ca3af", highlight: "#d1d5db", shadow: "#4b5563", size: 16 },
  mercury: { baseColor: "#78716c", highlight: "#a8a29e", shadow: "#44403c", size: 10 },
  venus: { baseColor: "#d4a574", highlight: "#e8c9a0", shadow: "#92693a", size: 12 },
  mars: { baseColor: "#b45430", highlight: "#dc7050", shadow: "#7c2d12", size: 11 },
  jupiter: { baseColor: "#c2956e", highlight: "#e0b89a", shadow: "#78563a", size: 18 },
  saturn: { baseColor: "#c9a96e", highlight: "#e0c898", shadow: "#8b7340", size: 18, hasRing: true, ringColor: "#a08850" },
  uranus: { baseColor: "#7dd3c0", highlight: "#a7f3d0", shadow: "#4a9a8a", size: 12 },
  neptune: { baseColor: "#3b82d6", highlight: "#60a5fa", shadow: "#1e3a6e", size: 12 },
  iss: { baseColor: "#fbbf24", highlight: "#fef08a", shadow: "#a16207", size: 6 },
};

/**
 * Draw a realistic mini planet on canvas at the given position.
 * Uses radial gradients to simulate 3D sphere with lighting.
 */
function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  dpr: number,
  isSelected: boolean
) {
  const style = PLANET_STYLES[name.toLowerCase()] || { baseColor: "#a78bfa", highlight: "#c4b5fd", shadow: "#6d28d9", size: 4 };
  const size = style.size * dpr * 0.5; // Half of defined size for proper radar scale

  // Selected: thin blue outline glow
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, size + 3 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(96, 165, 250, 0.5)";
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Soft outer glow
    const glowGrad = ctx.createRadialGradient(x, y, size, x, y, size + 6 * dpr);
    glowGrad.addColorStop(0, "rgba(96, 165, 250, 0.15)");
    glowGrad.addColorStop(1, "rgba(96, 165, 250, 0)");
    ctx.beginPath();
    ctx.arc(x, y, size + 6 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
  }

  // Saturn ring (drawn behind planet)
  if (style.hasRing && style.ringColor) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.8, size * 0.4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = style.ringColor;
    ctx.lineWidth = 1.5 * dpr;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.restore();
  }

  // Planet sphere — 3D radial gradient
  const lightX = x - size * 0.3;
  const lightY = y - size * 0.3;
  const grad = ctx.createRadialGradient(lightX, lightY, size * 0.1, x, y, size);
  grad.addColorStop(0, style.highlight);
  grad.addColorStop(0.5, style.baseColor);
  grad.addColorStop(1, style.shadow);

  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Jupiter bands (subtle horizontal lines)
  if (name.toLowerCase() === "jupiter") {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.clip();
    for (let i = -3; i <= 3; i++) {
      const bandY = y + i * size * 0.28;
      ctx.beginPath();
      ctx.moveTo(x - size, bandY);
      ctx.lineTo(x + size, bandY);
      ctx.strokeStyle = i % 2 === 0 ? "#6b4226" : "#a0703c";
      ctx.lineWidth = size * 0.15;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Sun corona (very subtle radial glow)
  if (name.toLowerCase() === "sun") {
    const coronaGrad = ctx.createRadialGradient(x, y, size * 0.8, x, y, size * 2);
    coronaGrad.addColorStop(0, "rgba(251, 191, 36, 0.08)");
    coronaGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = coronaGrad;
    ctx.fill();
  }

  // Moon: slight crater texture effect
  if (name.toLowerCase() === "moon") {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y - size * 0.1, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "#374151";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y + size * 0.3, size * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#374151";
    ctx.fill();
    ctx.restore();
  }
}

// ─── Satellite Dot ───────────────────────────────────────────────────────────

function drawSatellite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dpr: number,
  isSelected: boolean
) {
  const size = 2.5 * dpr;

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, size + 3 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(96, 165, 250, 0.5)";
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? "#c4b5fd" : "rgba(167, 139, 250, 0.6)";
  ctx.fill();
}

// ─── Label Collision ─────────────────────────────────────────────────────────

function resolveVisibleLabels(
  objects: Array<{ id: string; x: number; y: number; type: string }>,
  dpr: number,
  selectedId: string | null
): Set<string> {
  const shown = new Set<string>();
  const placed: Array<{ x: number; y: number }> = [];
  const minDist = 28 * dpr;

  // PHASE 1: Always show planets, sun, moon, ISS — they NEVER get culled
  for (const obj of objects) {
    if (obj.type === "star" || obj.type === "moon" || obj.type === "planet" || obj.type === "iss" || obj.id === selectedId) {
      shown.add(obj.id);
      placed.push({ x: obj.x, y: obj.y });
    }
  }

  // PHASE 2: Satellites — apply collision detection only among themselves
  const satellites = objects.filter((o) => o.type === "satellite" && !shown.has(o.id));
  for (const obj of satellites) {
    if (shown.size >= 30) break;
    const tooClose = placed.some((p) => Math.hypot(p.x - obj.x, p.y - obj.y) < minDist);
    if (!tooClose) {
      shown.add(obj.id);
      placed.push({ x: obj.x, y: obj.y });
    }
  }

  return shown;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipInfo { x: number; y: number; obj: CelestialObject }

// ─── Component ───────────────────────────────────────────────────────────────

export function ZenithRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const objectsRef = useRef<CelestialObject[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { issData } = useISSTracker();
  const { sun, moon, planets, lastUpdated: celestialUpdated } = useCelestialEngine();
  const { satellites: allSatellites } = useOrbitalData();
  const { filters, setVisibleCounts, setTotalCounts } = useRadarFilterStore();

  // Step 1: Compute ALL visible objects (elevation > 0) — unfiltered
  const allVisibleObjects: Array<CelestialObject & { filterKey: RadarFilterKey; satCategory?: string }> = useMemo(() => {
    if (!selectedLocation) return [];
    // celestialUpdated forces recomputation when celestial engine refreshes
    void celestialUpdated;
    const obs = { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude };
    const result: Array<CelestialObject & { filterKey: RadarFilterKey; satCategory?: string }> = [];

    if (sun && sun.elevation > 0) result.push({ id: "sun", name: "Sun", type: "star", azimuth: sun.azimuth, elevation: sun.elevation, magnitude: sun.magnitude, filterKey: "sun" });
    if (moon && moon.elevation > 0) result.push({ id: "moon", name: "Moon", type: "moon", azimuth: moon.azimuth, elevation: moon.elevation, magnitude: moon.magnitude, filterKey: "naturalSatellites" });
    if (issData) {
      const a = computeLookAngles(obs, { latitude: issData.latitude, longitude: issData.longitude, altitude: issData.altitude });
      if (a.elevation > 0) result.push({ id: "iss", name: "ISS", type: "iss", azimuth: a.azimuth, elevation: a.elevation, filterKey: "iss" });
    }
    for (const p of planets) {
      if (p.elevation > 0) result.push({ id: p.name.toLowerCase(), name: p.name, type: "planet", azimuth: p.azimuth, elevation: p.elevation, magnitude: p.magnitude, filterKey: "planets" });
    }
    if (allSatellites) {
      // Pre-filter: only run full ECEF look-angle calc for satellites within
      // a rough geographic bounding box (~70° lat, ~100° lon). Satellites
      // outside this box are geometrically guaranteed to be below the horizon.
      // This eliminates ~60–70% of the per-satellite ECEF math.
      const obsLat = selectedLocation.latitude;
      const obsLon = selectedLocation.longitude;
      const LAT_MARGIN = 70;  // degrees
      const LON_MARGIN = 100; // degrees (generous for high-inclination orbits)

      for (const sat of allSatellites) {
        const dLat = Math.abs(sat.latitude - obsLat);
        const dLon = Math.abs(((sat.longitude - obsLon + 540) % 360) - 180);
        if (dLat > LAT_MARGIN || dLon > LON_MARGIN) continue; // skip — can't be visible

        const a = computeLookAngles(obs, { latitude: sat.latitude, longitude: sat.longitude, altitude: sat.altitude });
        if (a.elevation > 0) {
          const filterKey = objectToFilterKey("satellite", sat.category);
          result.push({ id: `sat-${sat.id}`, name: sat.name.length > 14 ? sat.name.slice(0, 14) : sat.name, type: "satellite", azimuth: a.azimuth, elevation: a.elevation, filterKey, satCategory: sat.category });
        }
      }
    }
    return result;
  }, [issData, planets, moon, sun, allSatellites, selectedLocation, celestialUpdated]);

  // Step 2: Update visible/total counts (only when they actually change)
  const prevCountsRef = useRef<string>("");
  useEffect(() => {
    const visible: Record<string, number> = {};
    for (const obj of allVisibleObjects) {
      visible[obj.filterKey] = (visible[obj.filterKey] || 0) + 1;
    }
    const key = JSON.stringify(visible);
    if (key !== prevCountsRef.current) {
      prevCountsRef.current = key;
      setVisibleCounts(visible);
      setTotalCounts(visible);
    }
  }, [allVisibleObjects, setVisibleCounts, setTotalCounts]);

  // Step 3: Apply filters — only render objects whose filter is ON
  const objects: CelestialObject[] = useMemo(() => {
    return allVisibleObjects.filter((obj) => filters[obj.filterKey]);
  }, [allVisibleObjects, filters]);

  // Clear selection if selected object is filtered out
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && !objects.find((o) => o.id === selectedId)) return null;
    return selectedId;
  }, [objects, selectedId]);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = effectiveSelectedId; }, [effectiveSelectedId]);

  // Sync search store selection → radar highlight (via ref, no setState)
  const searchSelectedResult = useSearchStore((s) => s.selectedResult);
  const selectedSatellite = useSatelliteStore((s) => s.selectedSatellite);
  const searchRadarId = useMemo<string | null>(() => {
    // Priority 1: satellite store selection (from search or click)
    if (selectedSatellite) {
      return `sat-${selectedSatellite.id}`;
    }
    // Priority 2: search store result (planets, moon, etc.)
    if (!searchSelectedResult) return null;
    const type = searchSelectedResult.type;
    const name = searchSelectedResult.name.toLowerCase();
    if (type === "planet") return name;
    if (type === "moon") return "moon";
    if (type === "satellite" && searchSelectedResult.noradId === 25544) return "iss";
    return null;
  }, [searchSelectedResult, selectedSatellite]);

  // Merge click-selection with search-selection
  const mergedSelectedId = useMemo(() => {
    // Click selection takes priority if it exists
    if (effectiveSelectedId) return effectiveSelectedId;
    // Otherwise use search selection if it's on the radar
    if (searchRadarId && objects.find((o) => o.id === searchRadarId)) return searchRadarId;
    return null;
  }, [effectiveSelectedId, searchRadarId, objects]);

  // Keep ref in sync with merged value
  useEffect(() => { selectedIdRef.current = mergedSelectedId; }, [mergedSelectedId]);

  useEffect(() => { objectsRef.current = objects; }, [objects]);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setDimensions({ width, height });
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
      }
    });
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  // Mouse
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = devicePixelRatio;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const cx = (dimensions.width * dpr) / 2;
    const cy = (dimensions.height * dpr) / 2;
    const radius = Math.min(cx, cy) * 0.82;

    let closest: { obj: CelestialObject; dist: number } | null = null;
    for (const obj of objectsRef.current) {
      const r = (1 - obj.elevation / 90) * radius;
      const azRad = ((obj.azimuth - 90) * Math.PI) / 180;
      const ox = cx + Math.cos(azRad) * r;
      const oy = cy + Math.sin(azRad) * r;
      const dist = Math.hypot(mx - ox, my - oy);
      if (dist < 18 * dpr && (!closest || dist < closest.dist)) closest = { obj, dist };
    }
    setTooltip(closest ? { x: e.clientX, y: e.clientY, obj: closest.obj } : null);
  }, [dimensions]);

  const { setSelectedSatellite } = useSatelliteStore();

  const handleClick = useCallback(() => {
    if (tooltip) {
      setSelectedId(tooltip.obj.id);
      // If it's a satellite, populate the shared satellite detail store
      if (tooltip.obj.id.startsWith("sat-")) {
        const satId = tooltip.obj.id.replace("sat-", "");
        const sat = allSatellites.find((s) => s.id === satId);
        if (sat) setSelectedSatellite(sat);
      } else {
        setSelectedSatellite(null);
      }
    } else {
      setSelectedId(null);
      setSelectedSatellite(null);
    }
  }, [tooltip, allSatellites, setSelectedSatellite]);

  // Animation — 60fps canvas redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let sweep = 0;
    let running = true;

    // Pre-build the static background gradient once per resize
    const dprInit = devicePixelRatio;
    const wInit = dimensions.width * dprInit;
    const hInit = dimensions.height * dprInit;
    const cxInit = wInit / 2;
    const cyInit = hInit / 2;
    const radiusInit = Math.min(cxInit, cyInit) * 0.82;
    // Match app background: #0D0E10, with a subtle darker circle at the radar area
    const cachedBg = ctx.createRadialGradient(cxInit, cyInit, 0, cxInit, cyInit, radiusInit * 1.4);
    cachedBg.addColorStop(0, "#0a0b0d");
    cachedBg.addColorStop(0.65, "#0D0E10");
    cachedBg.addColorStop(1, "#0D0E10");

    const draw = () => {
      if (!running) return;
      const objs = objectsRef.current;
      const dpr = devicePixelRatio;
      const w = dimensions.width * dpr;
      const h = dimensions.height * dpr;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(cx, cy) * 0.82;

      ctx.clearRect(0, 0, w, h);

      // ── Background ── (cached, no allocation per frame)
      ctx.fillStyle = cachedBg;
      ctx.fillRect(0, 0, w, h);

      // ── Elevation Rings (0°, 22.5°, 45°, 67.5°) ──
      const elevations = [0, 22.5, 45, 67.5];
      for (const el of elevations) {
        const r = (1 - el / 90) * radius;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = el === 0
          ? "rgba(148, 163, 184, 0.55)"
          : el === 22.5
            ? "rgba(100, 116, 139, 0.4)"
            : "rgba(71, 85, 105, 0.3)";
        ctx.lineWidth = (el === 0 ? 1.5 : 1.0) * dpr;
        ctx.stroke();

        // Label
        if (el > 0) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
          ctx.font = `${7.5 * dpr}px monospace`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`${el}°`, cx + r + 4 * dpr, cy - 2 * dpr);
        }
      }

      // ── Azimuth Lines + Cardinals ──
      const cardinals: Array<{ l: string; deg: number; bold: boolean }> = [
        { l: "N", deg: 0, bold: true }, { l: "NE", deg: 45, bold: false },
        { l: "E", deg: 90, bold: true }, { l: "SE", deg: 135, bold: false },
        { l: "S", deg: 180, bold: true }, { l: "SW", deg: 225, bold: false },
        { l: "W", deg: 270, bold: true }, { l: "NW", deg: 315, bold: false },
      ];
      for (const { l, deg, bold } of cardinals) {
        const rad = ((deg - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * 6 * dpr, cy + Math.sin(rad) * 6 * dpr);
        ctx.lineTo(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius);
        ctx.strokeStyle = bold ? "rgba(148, 163, 184, 0.28)" : "rgba(100, 116, 139, 0.16)";
        ctx.lineWidth = bold ? 1.0 * dpr : 0.7 * dpr;
        ctx.stroke();

        const lr = radius + (bold ? 16 : 12) * dpr;
        ctx.fillStyle = bold ? "rgba(226, 232, 240, 0.85)" : "rgba(148, 163, 184, 0.55)";
        ctx.font = `${bold ? "700 " : "500 "}${(bold ? 12 : 9) * dpr}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(l, cx + Math.cos(rad) * lr, cy + Math.sin(rad) * lr);
      }

      // Degree ticks
      for (let deg = 0; deg < 360; deg += 10) {
        const rad = ((deg - 90) * Math.PI) / 180;
        const isMaj = deg % 30 === 0;
        const tickLen = (isMaj ? 6 : 3) * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * (radius - tickLen), cy + Math.sin(rad) * (radius - tickLen));
        ctx.lineTo(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius);
        ctx.strokeStyle = isMaj ? "rgba(148, 163, 184, 0.45)" : "rgba(100, 116, 139, 0.22)";
        ctx.lineWidth = isMaj ? 1.0 * dpr : 0.6 * dpr;
        ctx.stroke();
      }

      // ── Sweep ──
      sweep += 0.01;
      const sweepGrad = ctx.createConicGradient(sweep, cx, cy);
      sweepGrad.addColorStop(0, "rgba(56, 189, 248, 0.12)");
      sweepGrad.addColorStop(0.05, "rgba(56, 189, 248, 0.03)");
      sweepGrad.addColorStop(0.1, "rgba(56, 189, 248, 0)");
      sweepGrad.addColorStop(0.9, "rgba(56, 189, 248, 0)");
      sweepGrad.addColorStop(0.95, "rgba(56, 189, 248, 0.01)");
      sweepGrad.addColorStop(1, "rgba(56, 189, 248, 0.12)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * radius, cy + Math.sin(sweep) * radius);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();

      // ── Render Objects ──
      const renderedObjs = objs.map((obj) => {
        const r = (1 - obj.elevation / 90) * radius;
        const azRad = ((obj.azimuth - 90) * Math.PI) / 180;
        return { ...obj, x: cx + Math.cos(azRad) * r, y: cy + Math.sin(azRad) * r };
      });

      const visibleLabels = resolveVisibleLabels(renderedObjs, dpr, selectedIdRef.current);

      for (const obj of renderedObjs) {
        const isSel = obj.id === selectedIdRef.current;

        if (obj.type === "satellite") {
          drawSatellite(ctx, obj.x, obj.y, dpr, isSel);
        } else {
          // Planet/Sun/Moon/ISS — draw as realistic mini sphere
          const planetName = obj.id === "iss" ? "iss" : obj.name;
          drawPlanet(ctx, obj.x, obj.y, planetName, dpr, isSel);
        }

        // Label
        if (visibleLabels.has(obj.id)) {
          const style = PLANET_STYLES[obj.name.toLowerCase()] || PLANET_STYLES[obj.id];
          const labelOffset = ((style?.size || 6) * dpr * 0.5) + 6 * dpr;
          const isPlanetaryBody = obj.type === "star" || obj.type === "moon" || obj.type === "planet" || obj.type === "iss";

          if (isPlanetaryBody) {
            // Planet/Sun/Moon/ISS labels — larger, always visible, glass background
            const labelY = obj.y + labelOffset;
            const labelText = obj.name;
            ctx.font = `600 ${11 * dpr}px -apple-system, sans-serif`;
            const textWidth = ctx.measureText(labelText).width;

            // Glass pill background
            const pillPadX = 5 * dpr;
            const pillPadY = 2.5 * dpr;
            const pillX = obj.x - textWidth / 2 - pillPadX;
            const pillY = labelY - pillPadY;
            const pillW = textWidth + pillPadX * 2;
            const pillH = 11 * dpr + pillPadY * 2;

            ctx.fillStyle = "rgba(5, 2, 24, 0.7)";
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, 4 * dpr);
            ctx.fill();

            // Text with glow
            ctx.shadowColor = "rgba(200, 220, 255, 0.3)";
            ctx.shadowBlur = 3 * dpr;
            ctx.fillStyle = isSel ? "rgba(255, 255, 255, 1)" : "rgba(240, 245, 255, 0.9)";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(labelText, obj.x, labelY);
            ctx.shadowBlur = 0;
          } else {
            // Satellite labels — smaller, standard
            ctx.fillStyle = isSel ? "rgba(248, 250, 252, 0.9)" : "rgba(203, 213, 225, 0.55)";
            ctx.font = `${isSel ? "500 " : ""}${9 * dpr}px -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(obj.name, obj.x, obj.y + labelOffset);
          }
        }
      }

      // ── Zenith marker ──
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [dimensions]);

  // Mission Report Dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Keyboard shortcut: Ctrl+Shift+E to open report dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setReportDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0D0E10]" role="application" aria-label="Sky radar">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        style={{ display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleClick}
        aria-hidden="true"
      />

      {!selectedLocation && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-white/5 bg-[#050218]/90 px-6 py-4 text-center shadow-2xl backdrop-blur-md">
            <p className="text-sm font-medium text-slate-300">Select a location to view your sky</p>
            <p className="mt-1 text-xs text-slate-500">Click the globe or search for a city</p>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-slate-700/50 bg-[#0a0520]/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
          style={{ left: tooltip.x + 12, top: tooltip.y - 6 }}
        >
          <p className="text-[11px] font-medium text-slate-200">{tooltip.obj.name}</p>
          <p className="text-[10px] text-slate-500">
            Az {tooltip.obj.azimuth.toFixed(1)}° · El {tooltip.obj.elevation.toFixed(1)}°
            {tooltip.obj.magnitude !== undefined && ` · Mag ${tooltip.obj.magnitude.toFixed(1)}`}
          </p>
        </div>
      )}

      {/* Bottom status */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md border border-slate-800/50 bg-[#050218]/80 px-2.5 py-1 text-[10px] tabular-nums text-slate-500 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400/60" style={{ animationDuration: "2s" }} />
        <span>{objects.length} objects</span>
      </div>

      {/* Mission Report Button */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setReportDialogOpen(true)}
          title="Generate Mission Report (Ctrl+Shift+E)"
          className="flex items-center gap-2 rounded-lg border border-border-glow bg-surface-primary/90 px-3 py-2 text-xs font-medium text-nebula-300 shadow-lg backdrop-blur-sm transition hover:bg-surface-secondary hover:text-nebula-200 hover:shadow-nebula-500/10"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Mission Report</span>
        </button>
      </div>

      {/* Mission Report Dialog */}
      <MissionReportDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </div>
  );
}
