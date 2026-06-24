"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSimulationClock } from "@/stores/simulation-clock";
import {
  useSolarSystemStore,
  PLANETS,
  computePlanetPosition,
  type PlanetId,
} from "@/stores/solar-system-store";
import { getMoonsForPlanet } from "@/services/moon-data";

// ─── 3D Perspective Constants ────────────────────────────────────────────────

const SUN_RADIUS = 36;

const PLANET_SIZES: Record<PlanetId, number> = {
  mercury: 5, venus: 8, earth: 9, mars: 7,
  jupiter: 20, saturn: 18, uranus: 14, neptune: 13,
};

// Planet visual colors (richer for 3D shading)
const PLANET_COLORS: Record<PlanetId, { base: string; light: string; dark: string }> = {
  mercury: { base: "#8c8c8c", light: "#b8b8b8", dark: "#4a4a4a" },
  venus: { base: "#d4a06a", light: "#edd8b0", dark: "#8a6030" },
  earth: { base: "#4a8ef5", light: "#8ec4ff", dark: "#1a4a9a" },
  mars: { base: "#c04020", light: "#e07050", dark: "#6a2010" },
  jupiter: { base: "#c09858", light: "#e0c898", dark: "#705020" },
  saturn: { base: "#c8a860", light: "#e8d8a0", dark: "#786030" },
  uranus: { base: "#50b8a8", light: "#90e8d8", dark: "#207060" },
  neptune: { base: "#3858c8", light: "#7090f0", dark: "#182878" },
};

// Orbit scaling — ensures all planets have visible separation from the Sun
// Uses a power function that gives inner planets proportionally more space
function orbitScale(au: number): number {
  // Map AU range [0.387, 30.07] to pixel range [70, 500]
  // Using sqrt gives inner planets better spacing than linear
  return 70 + Math.sqrt(au) * 80;
}

// Starfield (pre-generated, deterministic)
const STAR_COUNT = 400;
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: ((i * 7919) % 1000) / 1000,
  y: ((i * 6271) % 1000) / 1000,
  size: 0.2 + ((i * 3571) % 100) / 200,
  brightness: 0.2 + ((i * 4391) % 100) / 150,
}));

// ─── Component ───────────────────────────────────────────────────────────────

export function SolarSystemScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { selectedPlanet, hoveredPlanet, zoom, offsetX, offsetY, showOrbits, showLabels, selectPlanet, setHoveredPlanet, setZoom } = useSolarSystemStore();
  const rotationX = useSolarSystemStore((s) => s.rotationX);
  const rotationZ = useSolarSystemStore((s) => s.rotationZ);
  const setRotation = useSolarSystemStore((s) => s.setRotation);

  const storeRef = useRef({ selectedPlanet, hoveredPlanet, zoom, offsetX, offsetY, showOrbits, showLabels, rotationX, rotationZ });
  useEffect(() => { storeRef.current = { selectedPlanet, hoveredPlanet, zoom, offsetX, offsetY, showOrbits, showLabels, rotationX, rotationZ }; }, [selectedPlanet, hoveredPlanet, zoom, offsetX, offsetY, showOrbits, showLabels, rotationX, rotationZ]);

  const planetScreenRef = useRef<Map<PlanetId, { sx: number; sy: number; r: number }>>(new Map());

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

  // Mouse interactions
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom(storeRef.current.zoom * (e.deltaY > 0 ? 0.88 : 1.12)); }, [setZoom]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => { isDragging.current = true; dragStart.current = { x: e.clientX, y: e.clientY }; offsetStart.current = { x: storeRef.current.rotationZ, y: storeRef.current.rotationX }; }, []);
  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      // Rotate: horizontal drag = rotationZ, vertical drag = rotationX (tilt)
      const dx = (e.clientX - dragStart.current.x) * 0.005;
      const dy = (e.clientY - dragStart.current.y) * 0.005;
      setRotation(offsetStart.current.y + dy, offsetStart.current.x + dx);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * devicePixelRatio;
    const my = (e.clientY - rect.top) * devicePixelRatio;
    let found: PlanetId | null = null;
    for (const [id, pos] of planetScreenRef.current) {
      if (Math.hypot(mx - pos.sx, my - pos.sy) < pos.r + 12 * devicePixelRatio) { found = id; break; }
    }
    setHoveredPlanet(found);
  }, [setHoveredPlanet, setRotation]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * devicePixelRatio;
    const my = (e.clientY - rect.top) * devicePixelRatio;
    let found: PlanetId | null = null;
    for (const [id, pos] of planetScreenRef.current) {
      if (Math.hypot(mx - pos.sx, my - pos.sy) < pos.r + 12 * devicePixelRatio) { found = id; break; }
    }
    selectPlanet(found);
  }, [selectPlanet]);

  const handleDblClick = useCallback(() => {
    const { hoveredPlanet } = storeRef.current;
    if (hoveredPlanet) { selectPlanet(hoveredPlanet); setZoom(storeRef.current.zoom * 1.8); }
  }, [selectPlanet, setZoom]);

  // ─── Main Render Loop ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let running = true;

    // Cache static gradients — recreated only on resize, not every frame
    const dpr = devicePixelRatio;
    const w = dimensions.width * dpr;
    const h = dimensions.height * dpr;

    // Background: match app color #0D0E10 — flat fill, no deep purple tint
    const cachedBg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h));
    cachedBg.addColorStop(0, "#111215");
    cachedBg.addColorStop(0.5, "#0D0E10");
    cachedBg.addColorStop(1, "#0a0b0d");

    const draw = () => {
      if (!running) return;
      const { zoom, offsetX, offsetY, showOrbits, showLabels, selectedPlanet, hoveredPlanet, rotationX, rotationZ } = storeRef.current;
      const dpr = devicePixelRatio;
      const w = dimensions.width * dpr;
      const h = dimensions.height * dpr;
      const cx = w / 2 + offsetX * dpr;
      const cy = h / 2 + offsetY * dpr;
      const simTime = useSimulationClock.getState().simulatedTime;
      const time = performance.now() / 1000;
      const cosX = Math.cos(rotationX);

      // ── Background: deep space with nebula ──
      ctx.fillStyle = cachedBg;
      ctx.fillRect(0, 0, w, h);

      // Subtle neutral centre glow — no purple tint
      ctx.save();
      ctx.globalAlpha = 0.03;
      const neb = ctx.createRadialGradient(cx, cy, 50 * dpr, cx, cy, 400 * dpr * zoom);
      neb.addColorStop(0, "#ffffff");
      neb.addColorStop(0.5, "#334155");
      neb.addColorStop(1, "transparent");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Stars
      ctx.save();
      for (const star of STARS) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * 0.3 + star.brightness * 20);
        ctx.globalAlpha = star.brightness * twinkle * 0.7; // slightly dimmer on lighter bg
        ctx.fillStyle = "#c8d4ff";
        ctx.fillRect(star.x * w, star.y * h, star.size * dpr, star.size * dpr);
      }
      ctx.restore();

      // ── Orbits (3D tilted ellipses) ──
      if (showOrbits) {
        for (const planet of PLANETS) {
          const orbitR = orbitScale(planet.orbitRadius) * zoom * dpr;
          const isActive = selectedPlanet === planet.id || hoveredPlanet === planet.id;

          ctx.beginPath();
          ctx.ellipse(cx, cy, orbitR, orbitR * Math.abs(cosX), 0, 0, Math.PI * 2);

          if (isActive) {
            ctx.shadowColor = selectedPlanet === planet.id ? "#6090ff" : "#a855f7";
            ctx.shadowBlur = 10 * dpr;
            ctx.strokeStyle = selectedPlanet === planet.id ? "rgba(96, 144, 255, 0.75)" : "rgba(168, 85, 247, 0.65)";
            ctx.lineWidth = 1.5 * dpr;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
            ctx.lineWidth = 1.0 * dpr;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ── Sun (bright glowing center) ──
      const sunR = SUN_RADIUS * dpr * Math.min(zoom * 0.2 + 0.8, 1.6);

      // Outer corona glow — gradient anchored to center, changes only with zoom
      const corona = ctx.createRadialGradient(cx, cy, sunR * 0.3, cx, cy, sunR * 5);
      corona.addColorStop(0, "rgba(255, 220, 100, 0.2)");
      corona.addColorStop(0.3, "rgba(255, 160, 30, 0.08)");
      corona.addColorStop(0.6, "rgba(255, 100, 0, 0.02)");
      corona.addColorStop(1, "rgba(255, 80, 0, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, sunR * 5, 0, Math.PI * 2);
      ctx.fillStyle = corona;
      ctx.fill();

      // Sun body
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 30 * dpr;
      const sunGrad = ctx.createRadialGradient(cx, cy - sunR * 0.15, sunR * 0.1, cx, cy, sunR);
      sunGrad.addColorStop(0, "#ffffff");
      sunGrad.addColorStop(0.2, "#fff8d0");
      sunGrad.addColorStop(0.5, "#ffcc33");
      sunGrad.addColorStop(0.8, "#ff8800");
      sunGrad.addColorStop(1, "#cc4400");
      ctx.beginPath();
      ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Planets (sorted by depth for proper z-ordering) ──
      const planetRenderData: Array<{ planet: typeof PLANETS[0]; sx: number; sy: number; r: number; depth: number }> = [];

      for (const planet of PLANETS) {
        const pos = computePlanetPosition(planet, simTime);
        const orbitR = orbitScale(planet.orbitRadius) * zoom * dpr;
        const angle = Math.atan2(pos.y, pos.x);

        // Apply horizontal rotation to orbital angle
        const rotatedAngle = angle + rotationZ;
        // Project: X is full radius, Y is compressed by tilt
        const sx = cx + Math.cos(rotatedAngle) * orbitR;
        const sy = cy + Math.sin(rotatedAngle) * orbitR * Math.abs(cosX);
        // Depth for z-ordering (positive = front/below, negative = back/above)
        const depth = Math.sin(rotatedAngle);

        const baseR = PLANET_SIZES[planet.id] * dpr;
        const isSelected = selectedPlanet === planet.id;
        const isHovered = hoveredPlanet === planet.id;
        // Planets further away (depth < 0) appear slightly smaller
        const perspScale = 0.85 + 0.15 * (depth + 1) / 2;
        const r = baseR * perspScale * (isSelected ? 1.25 : isHovered ? 1.1 : 1);

        planetRenderData.push({ planet, sx, sy, r, depth });
        planetScreenRef.current.set(planet.id, { sx, sy, r });
      }

      // Sort: render back-to-front (negative depth first)
      planetRenderData.sort((a, b) => a.depth - b.depth);

      for (const { planet, sx, sy, r, depth } of planetRenderData) {
        const isSelected = selectedPlanet === planet.id;
        const isHovered = hoveredPlanet === planet.id;
        const colors = PLANET_COLORS[planet.id];

        // Ambient: planets behind sun are dimmer
        const ambient = 0.6 + 0.4 * Math.max(0, -depth);

        // Planet glow (selected/hovered)
        if (isSelected || isHovered) {
          const glow = ctx.createRadialGradient(sx, sy, r, sx, sy, r * 3);
          glow.addColorStop(0, `${colors.base}30`);
          glow.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // 3D lit sphere — light comes from sun (center)
        const lightAngle = Math.atan2(cy - sy, cx - sx);
        const lx = sx + Math.cos(lightAngle) * r * 0.35;
        const ly = sy + Math.sin(lightAngle) * r * 0.35;

        const pGrad = ctx.createRadialGradient(lx, ly, r * 0.05, sx, sy, r);
        pGrad.addColorStop(0, colors.light);
        pGrad.addColorStop(0.5, colors.base);
        pGrad.addColorStop(1, colors.dark);

        ctx.save();
        ctx.globalAlpha = ambient;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.restore();

        // Saturn rings (tilted, semi-transparent)
        if (planet.id === "saturn") {
          ctx.save();
          ctx.globalAlpha = 0.7 * ambient;
          ctx.beginPath();
          ctx.ellipse(sx, sy, r * 2.5, r * 0.6, -0.15, 0, Math.PI * 2);
          const ringGrad = ctx.createLinearGradient(sx - r * 2.5, sy, sx + r * 2.5, sy);
          ringGrad.addColorStop(0, "rgba(200, 170, 100, 0.3)");
          ringGrad.addColorStop(0.3, "rgba(210, 180, 120, 0.7)");
          ringGrad.addColorStop(0.5, "rgba(180, 150, 80, 0.4)");
          ringGrad.addColorStop(0.7, "rgba(210, 180, 120, 0.7)");
          ringGrad.addColorStop(1, "rgba(200, 170, 100, 0.3)");
          ctx.strokeStyle = ringGrad;
          ctx.lineWidth = 3 * dpr;
          ctx.stroke();
          ctx.restore();
        }

        // Uranus ring (thinner, tilted)
        if (planet.id === "uranus") {
          ctx.save();
          ctx.globalAlpha = 0.35 * ambient;
          ctx.beginPath();
          ctx.ellipse(sx, sy, r * 1.8, r * 1.5, 1.2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(130, 210, 190, 0.5)";
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
          ctx.restore();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(sx, sy, r + 6 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(100, 160, 255, 0.6)";
          ctx.lineWidth = 1.2 * dpr;
          ctx.setLineDash([4 * dpr, 3 * dpr]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Label (only for front-facing planets to avoid clutter)
        if (showLabels && zoom > 0.4 && depth > -0.5) {
          const labelY = sy + r + 10 * dpr;
          ctx.fillStyle = isSelected ? "rgba(255,255,255,0.9)" : isHovered ? "rgba(255,255,255,0.7)" : "rgba(200,210,230,0.4)";
          ctx.font = `${(isSelected ? 11 : 9) * dpr}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(planet.name, sx, labelY);
        }

        // Moons (always visible for all planets)
        const moons = getMoonsForPlanet(planet.id);
        if (moons.length > 0) {
          const maxMoons = isSelected ? 8 : 4;
          for (let mi = 0; mi < Math.min(moons.length, maxMoons); mi++) {
            const moon = moons[mi]!;
            const moonOrbitR = (12 + mi * 6) * dpr * zoom;
            const moonAngle = time * (1.5 / moon.orbitalPeriod) + mi * 1.5;
            const mmx = sx + Math.cos(moonAngle) * moonOrbitR;
            const mmy = sy + Math.sin(moonAngle) * moonOrbitR * Math.abs(cosX);

            // Moon orbit ellipse
            ctx.beginPath();
            ctx.ellipse(sx, sy, moonOrbitR, moonOrbitR * Math.abs(cosX), 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(90, 95, 110, 0.25)";
            ctx.lineWidth = 0.6 * dpr;
            ctx.stroke();

            // Moon dot
            const moonR = Math.max(1.5, Math.min(3, moon.radius / 500)) * dpr;
            const moonGrad = ctx.createRadialGradient(mmx - moonR * 0.2, mmy - moonR * 0.2, 0, mmx, mmy, moonR);
            moonGrad.addColorStop(0, "rgba(220, 225, 240, 0.9)");
            moonGrad.addColorStop(1, "rgba(100, 110, 130, 0.7)");
            ctx.beginPath();
            ctx.arc(mmx, mmy, moonR, 0, Math.PI * 2);
            ctx.fillStyle = moonGrad;
            ctx.fill();

            if (zoom > 1.3 && mi < 5) {
              ctx.fillStyle = "rgba(180, 190, 210, 0.35)";
              ctx.font = `${7 * dpr}px -apple-system, sans-serif`;
              ctx.textAlign = "center";
              ctx.fillText(moon.name, mmx, mmy + moonR + 4 * dpr);
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [dimensions]);
  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ display: "block" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDragging.current = false; setHoveredPlanet(null); }}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onContextMenu={(e) => { e.preventDefault(); useSolarSystemStore.getState().resetView(); }}
        aria-label="3D Solar System Explorer"
        role="application"
      />
      {hoveredPlanet && !selectedPlanet && <Tooltip planetId={hoveredPlanet} />}
      {selectedPlanet && <DetailCard planetId={selectedPlanet} />}
      <Controls />
      <Presets />
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ planetId }: { planetId: PlanetId }) {
  const p = PLANETS.find((x) => x.id === planetId)!;
  const moons = getMoonsForPlanet(planetId).length;
  return (
    <div className="pointer-events-none absolute bottom-16 left-2 max-w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-space-950/85 px-3 py-2.5 backdrop-blur-xl sm:bottom-4 sm:left-4 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PLANET_COLORS[planetId].base }} />
        <span className="text-sm font-semibold text-white">{p.name}</span>
      </div>
      <p className="mt-1 text-[11px] text-white/50">{p.orbitRadius.toFixed(2)} AU · {p.period.toFixed(0)} day orbit{moons > 0 ? ` · ${moons} moon${moons > 1 ? "s" : ""}` : ""}</p>
      <p className="mt-0.5 hidden text-[10px] text-white/25 sm:block">Double-click to zoom · Right-click to reset</p>
    </div>
  );
}

// ─── Detail Card ─────────────────────────────────────────────────────────────

function DetailCard({ planetId }: { planetId: PlanetId }) {
  const p = PLANETS.find((x) => x.id === planetId)!;
  const select = useSolarSystemStore((s) => s.selectPlanet);
  const moons = getMoonsForPlanet(planetId).length;
  return (
    <div className="absolute bottom-16 left-2 w-[min(14rem,calc(100vw-4.5rem))] rounded-xl border border-white/10 bg-space-950/85 p-3 backdrop-blur-xl shadow-2xl sm:bottom-4 sm:left-4 sm:w-56 sm:p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PLANET_COLORS[planetId].base }} />
          <span className="text-sm font-semibold text-white">{p.name}</span>
        </div>
        <button onClick={() => select(null)} className="text-xs text-white/40 hover:text-white">✕</button>
      </div>
      <div className="mt-2 space-y-1 text-[10px] text-white/55">
        <Row l="Distance" v={`${p.orbitRadius.toFixed(3)} AU`} />
        <Row l="Period" v={`${p.period.toFixed(0)} days`} />
        <Row l="Inclination" v={`${p.inclination.toFixed(2)}°`} />
        <Row l="Eccentricity" v={p.eccentricity.toFixed(4)} />
        {moons > 0 && <Row l="Moons" v={String(moons)} />}
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between"><span>{l}</span><span className="font-mono text-white/80">{v}</span></div>;
}

// ─── Controls ────────────────────────────────────────────────────────────────

function Controls() {
  const { zoom, setZoom, resetView, toggleOrbits, toggleLabels } = useSolarSystemStore();
  const b = "rounded-xl bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-2 text-[#A8A9AD] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] hover:border-[rgba(255,255,255,0.12)]";
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-1.5">
      <button onClick={() => setZoom(zoom * 1.4)} className={b} aria-label="Zoom in"><PlusIcon /></button>
      <button onClick={() => setZoom(zoom * 0.7)} className={b} aria-label="Zoom out"><MinusIcon /></button>
      <button onClick={resetView} className={b} aria-label="Reset"><ResetIcon /></button>
      <div className="my-0.5 h-px bg-[rgba(255,255,255,0.06)]" />
      <button onClick={toggleOrbits} className={b} aria-label="Orbits"><OrbitIcon /></button>
      <button onClick={toggleLabels} className={b} aria-label="Labels"><LabelIcon /></button>
    </div>
  );
}

function Presets() {
  const { setZoom, setOffset, selectPlanet } = useSolarSystemStore();
  const go = (z: number) => { setOffset(0, 0); setZoom(z); selectPlanet(null); };
  return (
    <div className="absolute bottom-3 right-3 flex gap-1.5 sm:gap-2">
      {[{ l: "Fit All", z: 0.8 }, { l: "Inner", z: 2.2 }, { l: "Outer", z: 0.45 }].map((p) => (
        <button 
          key={p.l} 
          onClick={() => go(p.z)} 
          className="rounded-xl bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] px-2 py-1.5 text-[10px] font-medium text-[#A8A9AD] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] hover:border-[rgba(255,255,255,0.12)] min-h-[36px] sm:px-3 sm:text-xs"
        >
          {p.l}
        </button>
      ))}
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function PlusIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M12 6v12M6 12h12" /></svg>; }
function MinusIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M6 12h12" /></svg>; }
function ResetIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0113.5-5M20 15a8 8 0 01-13.5 5" /></svg>; }
function OrbitIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><ellipse cx="12" cy="12" rx="9" ry="4" strokeWidth={1.5} /><circle cx="12" cy="12" r="2" strokeWidth={1.5} /></svg>; }
function LabelIcon() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={1.5} d="M4 7h16M4 12h10M4 17h13" /></svg>; }
