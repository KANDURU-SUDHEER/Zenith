"use client"

import { useEffect, useRef } from "react"
import { MapPin, Eye, Telescope, Navigation } from "lucide-react"
import SectionWrapper, {
  FadeUp, SectionEyebrow, SectionHeadline, SectionBody
} from "./SectionWrapper"

type RadarObject = {
  name: string
  type: "planet" | "satellite" | "star" | "iss"
  angle: number
  dist: number
  speed: number
  color: string
  size: number
}

function SkyRadarCanvas() {
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

    const SZ = Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 32 : 420)
    canvas.width  = SZ * 2
    canvas.height = SZ * 2
    canvas.style.width  = `${SZ}px`
    canvas.style.height = `${SZ}px`
    ctx.scale(2, 2)

    const cx = SZ / 2, cy = SZ / 2
    const maxR = SZ * 0.44

    const objects: RadarObject[] = [
      { name: "Mars",      type: "planet",    angle: 0.8,  dist: 0.55, speed: 0.008, color: "#ff7043", size: 5   },
      { name: "Jupiter",   type: "planet",    angle: 2.1,  dist: 0.72, speed: 0.004, color: "#ffa726", size: 6   },
      { name: "Venus",     type: "planet",    angle: 4.5,  dist: 0.38, speed: 0.012, color: "#fff9c4", size: 5   },
      { name: "Saturn",    type: "planet",    angle: 1.4,  dist: 0.82, speed: 0.003, color: "#ffe082", size: 5   },
      { name: "ISS",       type: "iss",       angle: 3.2,  dist: 0.20, speed: 0.085, color: "#ffffff", size: 4   },
      { name: "HUBBLE",    type: "satellite", angle: 5.1,  dist: 0.30, speed: 0.065, color: "#80d8ff", size: 3   },
      { name: "GPS-IIR",   type: "satellite", angle: 0.3,  dist: 0.15, speed: 0.040, color: "#00c853", size: 2.5 },
      { name: "Sirius",    type: "star",      angle: 2.8,  dist: 0.65, speed: 0.001, color: "#e3f2fd", size: 3.5 },
      { name: "Betelgeuse",type: "star",      angle: 4.0,  dist: 0.78, speed: 0.001, color: "#ffb74d", size: 3   },
      { name: "Vega",      type: "star",      angle: 5.8,  dist: 0.60, speed: 0.001, color: "#e1f5fe", size: 3   },
    ]

    let sweepAngle = 0
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

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      bgGrad.addColorStop(0, "rgba(4,15,40,0.95)")
      bgGrad.addColorStop(1, "rgba(2,6,18,0.98)")
      ctx.fillStyle = bgGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 1; i <= 4; i++) {
        ctx.strokeStyle = `rgba(0,230,118,${i === 4 ? 0.20 : 0.09})`
        ctx.lineWidth   = i === 4 ? 1.2 : 0.7
        ctx.beginPath()
        ctx.arc(cx, cy, (maxR / 4) * i, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.strokeStyle = "rgba(0,230,118,0.12)"
      ctx.lineWidth   = 0.7
      ctx.setLineDash([3, 5])
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - maxR*0.7, cy - maxR*0.7); ctx.lineTo(cx + maxR*0.7, cy + maxR*0.7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + maxR*0.7, cy - maxR*0.7); ctx.lineTo(cx - maxR*0.7, cy + maxR*0.7); ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = "rgba(0,230,118,0.55)"
      ctx.font      = "bold 10px system-ui"
      ctx.textAlign = "center"
      ctx.fillText("N", cx,           cy - maxR - 10)
      ctx.fillText("S", cx,           cy + maxR + 16)
      ctx.fillText("E", cx + maxR + 14, cy + 4)
      ctx.fillText("W", cx - maxR - 14, cy + 4)

      sweepAngle = (sweepAngle + dt * 1.1) % (Math.PI * 2)
      const sweepWidth = Math.PI / 6

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, maxR, sweepAngle - sweepWidth, sweepAngle, false)
      ctx.closePath()
      const sg = ctx.createLinearGradient(
        cx + Math.cos(sweepAngle - sweepWidth) * maxR,
        cy + Math.sin(sweepAngle - sweepWidth) * maxR,
        cx + Math.cos(sweepAngle) * maxR,
        cy + Math.sin(sweepAngle) * maxR
      )
      sg.addColorStop(0, "rgba(0,230,118,0.0)")
      sg.addColorStop(1, "rgba(0,230,118,0.18)")
      ctx.fillStyle = sg
      ctx.fill()
      ctx.restore()

      ctx.strokeStyle = "rgba(0,230,118,0.65)"
      ctx.lineWidth   = 1.2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR)
      ctx.stroke()

      for (const obj of objects) {
        obj.angle = (obj.angle + obj.speed * dt) % (Math.PI * 2)
        const r   = obj.dist * maxR
        const ox  = cx + Math.cos(obj.angle) * r
        const oy  = cy + Math.sin(obj.angle) * r

        const halo = ctx.createRadialGradient(ox, oy, 0, ox, oy, obj.size * 4)
        halo.addColorStop(0, obj.color + "55")
        halo.addColorStop(1, "transparent")
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(ox, oy, obj.size * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = obj.color
        ctx.beginPath()
        ctx.arc(ox, oy, obj.size, 0, Math.PI * 2)
        ctx.fill()

        if (obj.type === "iss") {
          ctx.strokeStyle = "rgba(255,255,255,0.7)"
          ctx.lineWidth   = 0.8
          ctx.beginPath()
          ctx.moveTo(ox - 8, oy); ctx.lineTo(ox + 8, oy)
          ctx.moveTo(ox, oy - 8); ctx.lineTo(ox, oy + 8)
          ctx.stroke()
        }

        ctx.fillStyle = obj.color + "cc"
        ctx.font      = `${obj.type === "iss" ? "bold " : ""}9px system-ui`
        ctx.textAlign = "left"
        ctx.fillText(obj.name, ox + obj.size + 3, oy - 2)
      }

      ctx.fillStyle = "rgba(0,230,118,0.30)"
      ctx.font      = "8px system-ui"
      ctx.textAlign = "left"
      const labels = ["90°", "60°", "30°", "0°"]
      labels.forEach((l, i) => {
        ctx.fillText(l, cx + 3, cy - (maxR / 4) * (4 - i) - 2)
      })

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none select-none" />
}

const RADAR_FEATURES = [
  {
    icon: <MapPin className="h-4 w-4" />,
    title: "Location-Based Sky Mapping",
    desc: "Select any point on Earth and instantly generate your personal sky map — accurate to the second.",
  },
  {
    icon: <Telescope className="h-4 w-4" />,
    title: "Real-Time Celestial Tracking",
    desc: "Planets, stars, satellites, and the ISS plotted live on your sky dome with azimuth and elevation.",
  },
  {
    icon: <Navigation className="h-4 w-4" />,
    title: "ISS Pass Prediction",
    desc: "Know exactly when the ISS will pass over your location with magnitude forecasts and visibility windows.",
  },
  {
    icon: <Eye className="h-4 w-4" />,
    title: "Visibility Forecasting",
    desc: "Multi-day predictions for every tracked object — plan your observations days in advance.",
  },
]

export default function SkyRadarSection() {
  return (
    <SectionWrapper id="radar">
      <div className="grid items-center gap-10 lg:gap-16 lg:grid-cols-2">
        <FadeUp className="flex flex-col items-center">
          <div className="relative w-full flex justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-[-32px] rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(0,230,118,0.10), transparent 70%)" }}
            />
            <div className="relative overflow-hidden rounded-full border border-[#00e676]/20 bg-[#011408] p-2 shadow-[0_0_80px_rgba(0,230,118,0.12)]" style={{ maxWidth: "100%" }}>
              <SkyRadarCanvas />
            </div>
          </div>

          <FadeUp delay={0.2} className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <MapPin className="h-3.5 w-3.5 text-[#00e676]" />
            <span className="text-xs font-medium text-[#a0b8a8]">Cape Canaveral, FL, USA</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#6effa8] shadow-[0_0_6px_2px_rgba(110,255,168,0.7)]" />
          </FadeUp>
        </FadeUp>

        <div>
          <FadeUp>
            <SectionEyebrow>Live Sky Radar</SectionEyebrow>
            <SectionHeadline>
              See The{" "}
              <span className="text-gradient-zenith">Sky Above</span>{" "}
              Any Location On Earth
            </SectionHeadline>
            <SectionBody>
              Point Zenith at any coordinates and your sky transforms into a live astronomical radar. Every planet, satellite, star, and the ISS are plotted in real time with precise elevation and azimuth data.
            </SectionBody>
          </FadeUp>

          <div className="mt-8 grid gap-4">
            {RADAR_FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={0.08 + i * 0.08}>
                <div className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#00e676]/10 text-[#00e676]">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-[#6a8870]">{f.desc}</div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
