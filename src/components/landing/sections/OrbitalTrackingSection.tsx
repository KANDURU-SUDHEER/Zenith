"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Satellite, Radio, Navigation, Globe2,
  Activity, Target
} from "lucide-react"
import SectionWrapper, {
  FadeUp, SectionEyebrow, SectionHeadline, SectionBody, DataCard
} from "./SectionWrapper"

function OrbitalGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isVisible = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Pause rendering when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible.current = entries[0]?.isIntersecting ?? false
        // Resume the RAF loop if we just became visible and it had stopped.
        if (isVisible.current && raf === 0) {
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(canvas)
    isVisible.current = false

    const SIZE = 480
    canvas.width = SIZE * 2
    canvas.height = SIZE * 2
    canvas.style.width  = `${SIZE}px`
    canvas.style.height = `${SIZE}px`
    ctx.scale(2, 2)

    const cx = SIZE / 2, cy = SIZE / 2
    const R  = SIZE * 0.35

    const orbits: [number, number, number, number, string, number][] = [
      [R * 1.30, R * 0.45, -25, 0.28,  "#00e676", 3],
      [R * 1.55, R * 0.55,  18, 0.18,  "#00c853", 2.5],
      [R * 1.15, R * 0.38, -55, 0.40,  "#6effa8", 2],
      [R * 1.75, R * 0.60,  42, 0.12,  "#00e676", 2],
      [R * 1.40, R * 0.48, -10, 0.22,  "#ffd2a0", 2.5],
      [R * 1.22, R * 0.42,  35, 0.35,  "#ffffff", 4],
    ]

    const angles = orbits.map(() => Math.random() * Math.PI * 2)
    let raf = 0

    const draw = (now: number) => {
      void now

      if (!isVisible.current) {
        raf = 0
        return
      }

      ctx.clearRect(0, 0, SIZE, SIZE)

      const atmGrad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.15)
      atmGrad.addColorStop(0, "rgba(0,230,118,0.14)")
      atmGrad.addColorStop(1, "rgba(0,230,118,0)")
      ctx.fillStyle = atmGrad
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2)
      ctx.fill()

      const globeGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R)
      globeGrad.addColorStop(0,   "rgba(30,70,140,0.95)")
      globeGrad.addColorStop(0.5, "rgba(15,40,90,0.95)")
      globeGrad.addColorStop(1,   "rgba(5,15,40,0.98)")
      ctx.fillStyle = globeGrad
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R)
      rimGrad.addColorStop(0, "transparent")
      rimGrad.addColorStop(1, "rgba(0,230,118,0.35)")
      ctx.strokeStyle = rimGrad
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = "rgba(0,230,118,0.08)"
      ctx.lineWidth = 0.8
      for (let lat = -60; lat <= 60; lat += 30) {
        const ry = Math.sin((lat * Math.PI) / 180) * R
        const rx = Math.sqrt(R * R - ry * ry)
        ctx.beginPath()
        ctx.ellipse(cx, cy + ry, rx, rx * 0.28, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      for (let lng = 0; lng < 180; lng += 30) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, R * Math.abs(Math.cos((lng * Math.PI) / 180)), R, (lng * Math.PI) / 180, 0, Math.PI * 2)
        ctx.stroke()
      }

      for (let i = 0; i < orbits.length; i++) {
        const orb = orbits[i]!
        const [a, b, tilt, speed, color, dotR] = orb
        angles[i]! += speed * 0.008

        const cosT = Math.cos((tilt * Math.PI) / 180)
        const sinT = Math.sin((tilt * Math.PI) / 180)

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate((tilt * Math.PI) / 180)
        ctx.strokeStyle = color + "28"
        ctx.lineWidth   = i === 5 ? 1.2 : 0.8
        ctx.setLineDash(i === 5 ? [4, 4] : [2, 4])
        ctx.beginPath()
        ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        const ang = angles[i]!
        const sx  = Math.cos(ang) * a
        const sy  = Math.sin(ang) * b
        const tx  = cx + sx * cosT - sy * sinT
        const ty  = cy + sx * sinT + sy * cosT

        const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, dotR * 3.5)
        glow.addColorStop(0, color)
        glow.addColorStop(1, "transparent")
        ctx.globalAlpha = 0.35
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(tx, ty, dotR * 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(tx, ty, dotR, 0, Math.PI * 2)
        ctx.fill()

        if (i === 5) {
          ctx.fillStyle = "rgba(255,255,255,0.9)"
          ctx.font      = "bold 9px system-ui"
          ctx.fillText("ISS", tx + 6, ty - 5)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none select-none"
    />
  )
}

const TICKERS = [
  { name: "ISS", alt: "408 km", spd: "7.66 km/s", lat: "51.6°", lon: "32.4°", color: "#ffffff" },
  { name: "STARLINK-1234", alt: "550 km", spd: "7.60 km/s", lat: "28.3°", lon: "-82.1°", color: "#00e676" },
  { name: "GPS-IIR-14",   alt: "20200 km", spd: "3.87 km/s", lat: "42.8°", lon: "115.0°", color: "#00c853" },
  { name: "NOAA-18",      alt: "854 km",   spd: "7.46 km/s", lat: "-12.4°", lon: "55.3°", color: "#6effa8" },
  { name: "HUBBLE ST",    alt: "538 km",   spd: "7.58 km/s", lat: "28.5°", lon: "-45.7°", color: "#ffd2a0" },
]

function TelemetryTicker() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#040f06]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="zenith-dot-pulse h-2 w-2 rounded-full bg-[#6effa8]" />
          <span className="text-xs font-semibold text-[#a0b8a8]">Live Orbital Feed</span>
        </div>
        <span className="text-[10px] text-[#4a6450]">Updated: now</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {TICKERS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2.5 text-[11px] sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="truncate font-mono font-medium text-white">{t.name}</span>
            </div>
            <span className="text-[#6a8870]">{t.alt}</span>
            <span className="hidden text-[#6a8870] sm:block">{t.spd}</span>
            <span className="hidden text-right text-[#6a8870] sm:block">{t.lat} {t.lon}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default function OrbitalTrackingSection() {
  return (
    <SectionWrapper id="globe">
      <div className="grid items-end gap-10 lg:gap-16 lg:grid-cols-2">
        <div>
          <FadeUp>
            <SectionEyebrow>Real-Time Orbital Tracking</SectionEyebrow>
            <SectionHeadline>
              Track The Entire{" "}
              <span className="text-gradient-zenith">Orbital Ecosystem</span>{" "}
              In Real Time
            </SectionHeadline>
            <SectionBody>
              Zenith renders thousands of satellites orbiting Earth with live telemetry — altitude, velocity, latitude, longitude — updated every second. From the ISS to Starlink constellations, every object in the orbital shell is visible and searchable.
            </SectionBody>
          </FadeUp>

          <FadeUp delay={0.15} className="mt-8 flex flex-wrap gap-2">
            {[
              { icon: <Satellite className="h-3 w-3" />, label: "Live Satellite Positions" },
              { icon: <Navigation className="h-3 w-3" />, label: "Orbital Path Prediction" },
              { icon: <Target className="h-3 w-3" />, label: "ISS Tracking" },
              { icon: <Radio className="h-3 w-3" />, label: "Signal Monitoring" },
              { icon: <Globe2 className="h-3 w-3" />, label: "Global Coverage" },
              { icon: <Activity className="h-3 w-3" />, label: "Altitude & Velocity" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5"
              >
                <span className="text-[#00e676]">{f.icon}</span>
                <span className="text-xs font-medium text-[#a0b8a8]">{f.label}</span>
              </div>
            ))}
          </FadeUp>

          <FadeUp delay={0.25} className="mt-8 grid grid-cols-2 gap-3">
            <DataCard value="8,342+"  label="Satellites Tracked"    sub="Live positions"      />
            <DataCard value="<1s"     label="Update Latency"         sub="Real-time feed"      accent="#6effa8" />
            <DataCard value="99.9%"   label="Global Coverage"        sub="All inclinations"    accent="#00c853" />
            <DataCard value="24 / 7"  label="Continuous Monitoring"  sub="No blind spots"      accent="#ffd2a0" />
          </FadeUp>
        </div>

        <div className="flex flex-col items-center gap-6">
          <FadeUp delay={0.1} className="relative w-full flex justify-center">
            <div
              className="absolute inset-[-24px] rounded-full blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(0,230,118,0.12), transparent 70%)" }}
              aria-hidden="true"
            />
            <div className="overflow-hidden" style={{ maxWidth: "100%" }}>
              <OrbitalGlobe />
            </div>
          </FadeUp>

          <FadeUp delay={0.3} className="w-full max-w-[480px]">
            <TelemetryTicker />
          </FadeUp>
        </div>
      </div>
    </SectionWrapper>
  )
}
