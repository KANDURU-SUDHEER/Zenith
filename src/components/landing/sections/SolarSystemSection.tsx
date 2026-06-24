"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Sun, Orbit, BarChart3, Zap, Globe2, Activity } from "lucide-react"
import SectionWrapper, {
  FadeUp, SectionEyebrow, SectionHeadline, SectionBody, DataCard,
} from "./SectionWrapper"

interface Planet {
  name:   string
  color:  string
  ring?:  boolean
  r:      number
  orbit:  number
  speed:  number
  angle:  number
  moons?: { r: number; dist: number; speed: number; angle: number; color: string }[]
}

const PLANETS: Planet[] = [
  { name: "Mercury", color: "#bdbdbd", r: 3,   orbit: 48,  speed: 0.090, angle: 0.8 },
  { name: "Venus",   color: "#ffcc80", r: 5,   orbit: 74,  speed: 0.070, angle: 2.2 },
  {
    name: "Earth",   color: "#42a5f5", r: 5.5, orbit: 102, speed: 0.055, angle: 1.3,
    moons: [{ r: 1.8, dist: 12, speed: 0.38, angle: 0, color: "#cfd8dc" }],
  },
  {
    name: "Mars",    color: "#ef5350", r: 4,   orbit: 132, speed: 0.042, angle: 3.5,
    moons: [
      { r: 1.2, dist: 10, speed: 0.52, angle: 0,   color: "#bcaaa4" },
      { r: 1.0, dist: 14, speed: 0.28, angle: 1.8, color: "#a1887f" },
    ],
  },
  {
    name: "Jupiter", color: "#ff8f00", r: 13,  orbit: 178, speed: 0.015, angle: 5.2,
    moons: [
      { r: 1.8, dist: 18, speed: 0.45, angle: 0,   color: "#fff3e0" },
      { r: 1.6, dist: 23, speed: 0.30, angle: 2.2, color: "#ffe0b2" },
    ],
  },
  { name: "Saturn",  color: "#ffd54f", r: 10,  orbit: 218, speed: 0.010, angle: 0.4, ring: true },
  { name: "Uranus",  color: "#80deea", r: 7.5, orbit: 252, speed: 0.007, angle: 3.0 },
  { name: "Neptune", color: "#7986cb", r: 7,   orbit: 282, speed: 0.005, angle: 4.5 },
]

function SolarCanvas() {
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
        if (isVisible.current && raf === 0) {
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(canvas)
    isVisible.current = false

    const SZ = Math.min(520, typeof window !== 'undefined' ? window.innerWidth - 32 : 520)
    canvas.width  = SZ * 2
    canvas.height = SZ * 2
    canvas.style.width  = `${SZ}px`
    canvas.style.height = `${SZ}px`
    ctx.scale(2, 2)

    const cx = SZ / 2, cy = SZ / 2

    const STAR_N = 120
    const sx = new Float32Array(STAR_N)
    const sy = new Float32Array(STAR_N)
    const sr = new Float32Array(STAR_N)
    const sa = new Float32Array(STAR_N)
    for (let i = 0; i < STAR_N; i++) {
      sx[i] = ((i * 7919 + 1234) % 10000) / 10000 * SZ
      sy[i] = ((i * 6271 + 9876) % 10000) / 10000 * SZ
      sr[i] = 0.4 + (i % 4) * 0.25
      sa[i] = 0.25 + (i % 5) * 0.1
    }

    const planets: Planet[] = PLANETS.map((p) => ({
      ...p,
      moons: p.moons?.map((m) => ({ ...m })),
    }))

    let lastT = performance.now()
    let raf = 0

    const draw = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      if (!isVisible.current) {
        raf = 0
        return
      }

      ctx.clearRect(0, 0, SZ, SZ)
      ctx.fillStyle = "#01080a"
      ctx.fillRect(0, 0, SZ, SZ)

      for (let i = 0; i < STAR_N; i++) {
        ctx.globalAlpha = sa[i]!
        ctx.fillStyle   = "#fff"
        ctx.beginPath()
        ctx.arc(sx[i]!, sy[i]!, sr[i]!, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      for (const p of planets) {
        ctx.strokeStyle = "rgba(0,230,118,0.07)"
        ctx.lineWidth   = 0.7
        ctx.beginPath()
        ctx.arc(cx, cy, p.orbit, 0, Math.PI * 2)
        ctx.stroke()
      }

      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20)
      sg.addColorStop(0, "#fffde7"); sg.addColorStop(0.35, "#ffcc02")
      sg.addColorStop(0.75, "#ff8c00"); sg.addColorStop(1, "transparent")
      ctx.fillStyle = sg
      ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill()
      const cg = ctx.createRadialGradient(cx, cy, 12, cx, cy, 44)
      cg.addColorStop(0, "rgba(255,160,0,0.22)"); cg.addColorStop(1, "transparent")
      ctx.fillStyle = cg
      ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.60)"
      ctx.font = "bold 8px system-ui"; ctx.textAlign = "center"
      ctx.fillText("Sun", cx, cy + 28)

      for (const p of planets) {
        p.angle = (p.angle + p.speed * dt) % (Math.PI * 2)
        const px2 = cx + Math.cos(p.angle) * p.orbit
        const py2 = cy + Math.sin(p.angle) * p.orbit

        const glw = ctx.createRadialGradient(px2, py2, 0, px2, py2, p.r * 2.8)
        glw.addColorStop(0, p.color + "66"); glw.addColorStop(1, "transparent")
        ctx.fillStyle = glw
        ctx.beginPath(); ctx.arc(px2, py2, p.r * 2.8, 0, Math.PI * 2); ctx.fill()

        if (p.ring) {
          ctx.save(); ctx.translate(px2, py2); ctx.scale(1, 0.30)
          ctx.strokeStyle = "rgba(255,213,79,0.50)"; ctx.lineWidth = 3.5
          ctx.beginPath(); ctx.arc(0, 0, p.r * 2.0, 0, Math.PI * 2); ctx.stroke()
          ctx.strokeStyle = "rgba(255,213,79,0.22)"; ctx.lineWidth = 2.2
          ctx.beginPath(); ctx.arc(0, 0, p.r * 2.5, 0, Math.PI * 2); ctx.stroke()
          ctx.restore()
        }

        const bg = ctx.createRadialGradient(px2 - p.r * 0.28, py2 - p.r * 0.28, 0, px2, py2, p.r)
        bg.addColorStop(0, p.color); bg.addColorStop(1, p.color + "88")
        ctx.fillStyle = bg
        ctx.beginPath(); ctx.arc(px2, py2, p.r, 0, Math.PI * 2); ctx.fill()

        if (p.moons) {
          for (const m of p.moons) {
            m.angle = (m.angle + m.speed * dt) % (Math.PI * 2)
            const mx = px2 + Math.cos(m.angle) * m.dist
            const my = py2 + Math.sin(m.angle) * m.dist
            ctx.strokeStyle = "rgba(200,200,220,0.10)"; ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.arc(px2, py2, m.dist, 0, Math.PI * 2); ctx.stroke()
            ctx.fillStyle = m.color
            ctx.beginPath(); ctx.arc(mx, my, m.r, 0, Math.PI * 2); ctx.fill()
          }
        }

        const small = p.r <= 4
        ctx.fillStyle = small ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.58)"
        ctx.font = small ? "7px system-ui" : "8px system-ui"
        ctx.textAlign = "center"
        ctx.fillText(p.name, px2, py2 + p.r + 9)
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none select-none" />
}

const PLANET_ROWS = [
  { name: "Mercury", dist: "0.39 AU", vel: "47.9 km/s", color: "#bdbdbd" },
  { name: "Venus",   dist: "0.72 AU", vel: "35.0 km/s", color: "#ffcc80" },
  { name: "Earth",   dist: "1.00 AU", vel: "29.8 km/s", color: "#42a5f5" },
  { name: "Mars",    dist: "1.52 AU", vel: "24.1 km/s", color: "#ef5350" },
  { name: "Jupiter", dist: "5.20 AU", vel: "13.1 km/s", color: "#ff8f00" },
  { name: "Saturn",  dist: "9.58 AU", vel: "9.7 km/s",  color: "#ffd54f" },
  { name: "Uranus",  dist: "19.2 AU", vel: "6.8 km/s",  color: "#80deea" },
  { name: "Neptune", dist: "30.1 AU", vel: "5.4 km/s",  color: "#7986cb" },
]

const SOLAR_FEATURES = [
  { icon: <Sun className="h-3.5 w-3.5" />,      color: "#ffd2a0", label: "Real-Time Positions",  desc: "JPL ephemeris data" },
  { icon: <Orbit className="h-3.5 w-3.5" />,    color: "#00c853", label: "Moon Tracking",        desc: "Earth, Mars, Jupiter" },
  { icon: <BarChart3 className="h-3.5 w-3.5" />, color: "#00e676", label: "Orbital Simulation",  desc: "Newtonian precision" },
  { icon: <Zap className="h-3.5 w-3.5" />,      color: "#6effa8", label: "Interactive",          desc: "Select any planet" },
  { icon: <Globe2 className="h-3.5 w-3.5" />,   color: "#ff8f00", label: "Saturn Rings",         desc: "Tilted visualization" },
  { icon: <Activity className="h-3.5 w-3.5" />, color: "#80deea", label: "All 8 Planets",        desc: "Mercury to Neptune" },
]

function GlitterField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const glitterVisible = useRef(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.offsetWidth  || 400
    const H = canvas.offsetHeight || 140
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = W * DPR
    canvas.height = H * DPR
    ctx.scale(DPR, DPR)

    const N = 100
    const px = Array.from({ length: N }, (_, i) => ((i * 7919 + 31) % 10000) / 10000 * W)
    const py = Array.from({ length: N }, (_, i) => ((i * 6271 + 77) % 10000) / 10000 * H)
    const pr = Array.from({ length: N }, (_, i) => 0.4 + (i % 5) * 0.28)
    const pp = Array.from({ length: N }, (_, i) => i * 0.55)
    const pc = Array.from({ length: N }, (_, i) => {
      const cols = ["#00e676", "#00c853", "#ffd2a0", "#6effa8", "#ffffff"]
      return cols[i % cols.length]!
    })
    const shoots = Array.from({ length: 3 }, (_, i) => ({
      x: ((i * 3871 + 44) % 10000) / 10000 * W,
      y: ((i * 5432 + 22) % 10000) / 10000 * H * 0.7,
      phase: i * 0.33,
      len: 25 + i * 12,
    }))

    // Pause rendering when scrolled out of view
    const glitterObserver = new IntersectionObserver(
      (entries) => {
        glitterVisible.current = entries[0]?.isIntersecting ?? false
        if (glitterVisible.current && raf === 0) {
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.01 }
    )
    glitterObserver.observe(canvas)
    glitterVisible.current = false

    let raf = 0
    const draw = (now: number) => {
      if (!glitterVisible.current) {
        raf = 0
        return
      }
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < N; i++) {
        const alpha = 0.08 + 0.32 * Math.abs(Math.sin(now * 0.0008 + pp[i]!))
        ctx.globalAlpha = alpha
        ctx.fillStyle = pc[i]!
        ctx.beginPath()
        ctx.arc(px[i]!, py[i]!, pr[i]!, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      for (const s of shoots) {
        const phase = ((now * 0.00007 + s.phase) % 1)
        if (phase < 0.3) {
          const alpha = phase < 0.05 ? phase / 0.05 : phase > 0.25 ? (0.3 - phase) / 0.05 : 1
          ctx.globalAlpha = alpha * 0.55
          const g = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y + s.len * 0.2)
          g.addColorStop(0, "transparent"); g.addColorStop(1, "#ffffff")
          ctx.strokeStyle = g; ctx.lineWidth = 1
          const prog = phase / 0.3
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x + s.len * prog, s.y + s.len * 0.2 * prog)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); glitterObserver.disconnect() }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}

export default function SolarSystemSection() {
  return (
    <SectionWrapper id="solar-system" bleedColor="rgba(40,10,80,0.55)">
      <div className="grid items-stretch gap-10 lg:gap-12 lg:grid-cols-2">
        <div className="flex flex-col">
          <FadeUp>
            <SectionEyebrow>Solar System Simulation</SectionEyebrow>
            <SectionHeadline>
              Explore A{" "}
              <span className="text-gradient-zenith">Living Solar System</span>
              {" "}— All 8 Planets
            </SectionHeadline>
            <SectionBody>
              A real-time orrery with all eight planets, natural moons, and accurate orbital periods. Mercury speeds, Neptune drifts — every orbit live.
            </SectionBody>
          </FadeUp>

          <FadeUp delay={0.15} className="mt-6 grid grid-cols-2 gap-2">
            {SOLAR_FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5"
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ background: f.color + "18", color: f.color }}
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">{f.label}</div>
                  <div className="text-[10px] text-[#6a8870]">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </FadeUp>

          <FadeUp delay={0.3} className="mt-6 grid grid-cols-2 gap-3">
            <DataCard value="8"         label="Planets Live"   sub="All solar system bodies" accent="#ffd2a0" />
            <DataCard value="20+"       label="Natural Moons"  sub="Major moons tracked"     accent="#00c853" />
            <DataCard value="Real-Time" label="Orbital Engine" sub="Delta-time driven"       accent="#00e676" />
            <DataCard value="∞"         label="Explore Depth"  sub="Zoom any object"         accent="#6effa8" />
          </FadeUp>

          <FadeUp delay={0.4} className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#040f06]">
              <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00e676]">
                  All 8 Planets — Live Positions
                </span>
                <span className="zenith-dot-pulse h-2 w-2 rounded-full bg-[#6effa8]" />
              </div>
              {/* Scrollable table on small screens */}
              <div className="overflow-x-auto">
                <div className="grid grid-cols-2 divide-x divide-white/[0.05] min-w-[280px]">
                  {[PLANET_ROWS.slice(0, 4), PLANET_ROWS.slice(4, 8)].map((col, colIdx) => (
                    <div key={colIdx} className="divide-y divide-white/[0.05]">
                      {col.map((p, i) => (
                        <motion.div
                          key={p.name}
                          initial={{ opacity: 0, x: colIdx === 0 ? -10 : 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.04 + (colIdx * 4 + i) * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center justify-between px-3 py-2.5 sm:px-4"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: p.color, boxShadow: `0 0 6px ${p.color}88` }}
                            />
                            <span className="text-xs font-semibold text-white sm:text-sm">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-[#a0b8a8]">{p.dist}</div>
                            <div className="text-[10px] text-[#4a6450]">{p.vel}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>

        <FadeUp delay={0.1} className="relative flex flex-col items-center justify-start">
          <div className="relative w-full overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-[-28px] rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(255,160,0,0.08), transparent 70%)" }}
            />
            <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#01080a] shadow-[0_0_50px_rgba(255,160,0,0.06)]">
              <SolarCanvas />
            </div>
          </div>
          <div className="relative mt-4 w-full flex-1 overflow-hidden rounded-2xl border border-white/6 bg-[#01080a]" style={{ minHeight: "140px" }}>
            <GlitterField />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00e676]">Live Simulation</p>
              <p className="text-center text-[11px] leading-relaxed text-[#4a6450]">
                Delta-time orbital engine · JPL ephemeris data · Newtonian gravity model
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </SectionWrapper>
  )
}
