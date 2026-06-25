"use client"

import { useEffect, useRef } from "react"
import { ArrowRight, Orbit } from "lucide-react"
import { FadeUp } from "./SectionWrapper"

function OrbitalRingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isVisible = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
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

    const W = Math.min(700, typeof window !== 'undefined' ? window.innerWidth : 700)
    const H = W
    canvas.width = W * 2; canvas.height = H * 2
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
    ctx.scale(2, 2)

    const cx = W / 2, cy = H / 2

    type Dot = { a: number; r: number; speed: number; color: string; size: number }
    const dots: Dot[] = Array.from({ length: 24 }, (_, i) => ({
      a: (i / 24) * Math.PI * 2,
      r: 200 + (i % 3) * 55,
      speed: 0.006 + (i % 5) * 0.004,
      color: ["#00e676", "#00c853", "#6effa8", "#ffd2a0"][i % 4]!,
      size: 2 + (i % 3),
    }))

    let raf = 0
    const draw = () => {
      if (!isVisible.current) {
        raf = 0
        return
      }
      ctx.clearRect(0, 0, W, H)
      for (const r of [180, 235, 280, 315]) {
        ctx.strokeStyle = "rgba(0,230,118,0.07)"; ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
      }
      for (const d of dots) {
        d.a = (d.a + d.speed * 0.016) % (Math.PI * 2)
        const x = cx + Math.cos(d.a) * d.r, y = cy + Math.sin(d.a) * d.r
        const g = ctx.createRadialGradient(x, y, 0, x, y, d.size * 3.5)
        g.addColorStop(0, d.color + "aa"); g.addColorStop(1, "transparent")
        ctx.globalAlpha = 0.6; ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(x, y, d.size * 3.5, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = d.color
        ctx.beginPath(); ctx.arc(x, y, d.size, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none select-none opacity-60" />
}

function MagneticLaunch() {
  return (
    <button
      type="button"
      onClick={() => window.location.href = "/zenith"}
      className="btn-zenith-primary group relative inline-flex h-14 w-full max-w-xs items-center justify-center gap-3 overflow-hidden rounded-full px-8 text-base font-bold text-white sm:h-16 sm:w-auto sm:max-w-none sm:px-10"
    >
      <span className="relative z-10 flex items-center gap-3">
        Launch Zenith
        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </button>
  )
}

export default function FinalCTASection() {
  return (
    <section id="launch" className="relative overflow-hidden pb-20 pt-10 md:pb-28 md:pt-14"
      style={{ background: "linear-gradient(to bottom, #020a04 0%, #020308 40%, #000000 100%)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-50">
        <OrbitalRingCanvas />
      </div>
      <div aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(0,230,118,0.07), rgba(0,200,83,0.05) 50%, transparent 70%)" }} />

      <div className="relative mx-auto max-w-[780px] px-4 text-center sm:px-6">
        <FadeUp>
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="zenith-spin-30s flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#00e676]/15 to-[#00c853]/15 border border-[#00e676]/20">
              <Orbit className="h-6 w-6 text-[#00e676]" />
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2
            className="break-words font-black leading-[1.05] tracking-[-0.03em] text-white"
            style={{ fontSize: "clamp(1.65rem, 6vw, 3.75rem)", overflowWrap: "break-word" }}
          >
            The Universe Is Moving.{" "}
            <span className="text-gradient-zenith">So Is Zenith.</span>
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mx-auto mt-4 max-w-full break-words text-sm leading-[1.8] text-[#80a888] sm:max-w-[48ch] md:text-base">
            Track satellites. Explore planets. Monitor the sky. Discover the cosmos —
            unified in one cinematic platform.
          </p>
        </FadeUp>

        <FadeUp delay={0.3} className="mt-8 flex items-center justify-center">
          <MagneticLaunch />
        </FadeUp>

        <FadeUp delay={0.4}>
          <p className="mt-6 text-xs text-[#3a5040]">
            Free to explore · No credit card required · Launch in 30 seconds
          </p>
        </FadeUp>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px]"
        style={{ background: "linear-gradient(to top, #01080a, transparent)" }} />
    </section>
  )
}
