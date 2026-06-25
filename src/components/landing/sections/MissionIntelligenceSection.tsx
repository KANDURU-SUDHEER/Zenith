"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Satellite, Radio, Globe2, Eye, Sun, Target, Search } from "lucide-react"
import SectionWrapper, { FadeUp, SectionEyebrow } from "./SectionWrapper"

const FEATURES = [
  { icon: <Satellite className="h-5 w-5" />, label: "Satellite Tracking",  color: "#00e676", desc: "8,342+ live positions",    extra: ["LEO · MEO · GEO", "Updated < 1s"] },
  { icon: <Radio     className="h-5 w-5" />, label: "Sky Radar",           color: "#6effa8", desc: "Any location on Earth",     extra: ["Azimuth & elevation", "ISS pass alerts"] },
  { icon: <Sun       className="h-5 w-5" />, label: "Solar System",        color: "#ffd2a0", desc: "Real-time orrery",          extra: ["All 8 planets live", "Moon tracking"] },
  { icon: <Globe2    className="h-5 w-5" />, label: "ISS Monitor",         color: "#00c853", desc: "Live orbital telemetry",    extra: ["Alt: 408 km · 7.66 km/s", "Crew: 7 aboard"] },
  { icon: <Eye       className="h-5 w-5" />, label: "NASA APOD",           color: "#ff8a65", desc: "Daily cosmic discovery",    extra: ["New image every 24h", "Archive: 10,000+"] },
  { icon: <Target    className="h-5 w-5" />, label: "Orbital Predictions", color: "#ce93d8", desc: "72-hour forecast engine",   extra: ["TLE propagation", "Re-entry alerts"] },
  { icon: <Search    className="h-5 w-5" />, label: "Search Engine",       color: "#fff176", desc: "10,000+ tracked objects",   extra: ["NORAD catalog", "Instant lookup"] },
]

function ISSOrbitCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const isVisible = useRef(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible.current = entries[0]?.isIntersecting ?? false
        if (isVisible.current && raf === 0) {
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(canvas)
    isVisible.current = false

    const W = 160, H = 110
    canvas.width = W * 2; canvas.height = H * 2
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    ctx.scale(2, 2)

    const cx = W / 2, cy = H / 2
    const earthR = 26
    const oA = earthR * 1.6, oB = earthR * 0.55
    const tilt = Math.PI / 6
    let angle = 0, raf = 0

    const draw = () => {
      if (!isVisible.current) {
        raf = 0
        return
      }
      ctx.clearRect(0, 0, W, H)
      const eg = ctx.createRadialGradient(cx, cy, earthR * 0.5, cx, cy, earthR * 1.5)
      eg.addColorStop(0, "rgba(66,165,245,0.15)"); eg.addColorStop(1, "transparent")
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, earthR * 1.5, 0, Math.PI * 2); ctx.fill()
      const eg2 = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, earthR)
      eg2.addColorStop(0, "rgba(40,90,160,0.9)"); eg2.addColorStop(1, "rgba(5,20,50,0.98)")
      ctx.fillStyle = eg2; ctx.beginPath(); ctx.arc(cx, cy, earthR, 0, Math.PI * 2); ctx.fill()
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt)
      ctx.strokeStyle = "rgba(0,200,83,0.28)"; ctx.lineWidth = 0.9; ctx.setLineDash([3, 4])
      ctx.beginPath(); ctx.ellipse(0, 0, oA, oB, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([]); ctx.restore()
      angle = (angle + 0.024) % (Math.PI * 2)
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt)
      const sx = Math.cos(angle) * oA, sy = Math.sin(angle) * oB
      const tx = cx + sx * cosT - sy * sinT, ty = cy + sx * sinT + sy * cosT
      const ig = ctx.createRadialGradient(tx, ty, 0, tx, ty, 7)
      ig.addColorStop(0, "rgba(0,200,83,0.85)"); ig.addColorStop(1, "transparent")
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#e0c8ff"; ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(224,200,255,0.8)"; ctx.font = "bold 7px system-ui"; ctx.textAlign = "left"
      ctx.fillText("ISS", tx + 4, ty - 3)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none select-none" />
}

function ISSLiveCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: 0.24, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-[#00c853]/20 bg-[#00c853]/[0.04] p-4"
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,200,83,0.10), transparent 65%)" }} aria-hidden="true" />
      <div className="relative z-10 flex justify-center"><ISSOrbitCanvas /></div>
      <div className="relative z-10 mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
        {[
          { k: "Altitude", v: "408 km" }, { k: "Speed", v: "7.66 km/s" },
          { k: "Crew",     v: "7 aboard" }, { k: "Period", v: "92.9 min" },
        ].map((row) => (
          <div key={row.k} className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 text-[10px] text-[#4a6450]">{row.k}</span>
            <span className="min-w-0 truncate text-right text-[11px] font-semibold text-[#c8a8ff]">{row.v}</span>
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[#00c853] zenith-dot-pulse-slow" />
    </motion.div>
  )
}

function DataStream({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="h-px w-full rounded-full"
      style={{ background: "linear-gradient(90deg, transparent, #00e67644, transparent)" }}
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

function CenterHub() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[#00e676] zenith-dot-pulse"
          style={{
            width: `${i * 44}px`,
            height: `${i * 44}px`,
            animationDuration: `${2.5 + i * 0.5}s`,
            opacity: 0.4 / i,
          }}
        />
      ))}
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00e676] to-[#00c853] shadow-[0_0_36px_rgba(0,230,118,0.5)]">
        <Globe2 className="h-6 w-6 text-white" />
      </div>
    </div>
  )
}

export default function MissionIntelligenceSection() {
  return (
    <SectionWrapper id="platform" tight>
      <FadeUp className="mx-auto max-w-4xl text-center">
        <SectionEyebrow>Platform Overview</SectionEyebrow>
        <p className="mt-4 break-words font-black leading-[1.1] tracking-[-0.025em] text-white"
          style={{ fontSize: "clamp(1.35rem, 5vw, 2.9rem)", overflowWrap: "break-word" }}>
          Zenith is not a collection of tools.
        </p>
        <p className="mt-2 break-words font-black leading-[1.1] tracking-[-0.025em]"
          style={{
            fontSize: "clamp(1.35rem, 5vw, 2.9rem)",
            background: "linear-gradient(105deg, #00e676 0%, #00c853 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            overflowWrap: "break-word",
          }}>
          It is one unified intelligence platform.
        </p>
        <p className="mx-auto mt-5 max-w-full break-words text-sm leading-[1.85] text-[#80a888] sm:max-w-[58ch] md:text-[0.95rem]">
          Every module feeds into every other — satellite tracking, sky radar, solar system, APOD, orbital predictions — all connected, all real-time, all in one place.
        </p>
      </FadeUp>

      <FadeUp delay={0.12} className="mt-10">
        <div className="flex justify-center"><CenterHub /></div>
        <div className="mx-auto mt-4 flex max-w-lg flex-col gap-1 px-4">
          <DataStream delay={0.2} /><DataStream delay={0.3} />
        </div>
      </FadeUp>

      <FadeUp delay={0.2} className="mt-6">
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.label}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.04+i*0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/6 bg-white/[0.03] p-4 transition-colors hover:border-white/12 hover:bg-white/[0.05]">
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 50% 0%, ${f.color}14, transparent 60%)` }} aria-hidden="true" />
              <div className="relative z-10 mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: f.color+"18", color: f.color }}>{f.icon}</div>
              <div className="relative z-10 min-w-0">
                <div className="break-words text-sm font-semibold text-white">{f.label}</div>
                <div className="mt-0.5 break-words text-[11px]" style={{ color: f.color+"bb" }}>{f.desc}</div>
                <div className="mt-2 space-y-0.5 border-t border-white/[0.06] pt-2">
                  {f.extra.map((line) => (
                    <div key={line} className="break-words text-[10px] text-[#4a6450]">{line}</div>
                  ))}
                </div>
              </div>
              <div
                className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full zenith-dot-pulse-slow"
                style={{ background: f.color, animationDelay: `${(i % 3) * 0.4}s` }}
              />
            </motion.div>
          ))}
          <ISSLiveCard />
        </div>
      </FadeUp>

      <FadeUp delay={0.35} className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 rounded-3xl border border-white/6 bg-white/[0.02] p-4 sm:p-5">
        {[
          { value: "7",         label: "Core Modules",      color: "#00e676" },
          { value: "Real-Time", label: "All Data Sources",  color: "#6effa8" },
          { value: "∞",         label: "Exploration Depth", color: "#ffd2a0" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#6a8870]">{s.label}</div>
          </div>
        ))}
      </FadeUp>
    </SectionWrapper>
  )
}
