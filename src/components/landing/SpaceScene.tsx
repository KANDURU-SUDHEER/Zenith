"use client"

import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import StarField from "@/components/landing/StarField"
import MeteorLayer from "@/components/landing/MeteorLayer"
import Astronaut from "@/components/landing/Astronaut"
import Satellite from "@/components/landing/Satellite"
import Rocket from "@/components/landing/Rocket"

const EarthScene = dynamic(() => import("@/components/landing/EarthScene"), { ssr: false })

function SpaceDust() {
  const ref = useRef<HTMLCanvasElement>(null)
  const isVisible = useRef(true) // SpaceDust is hero-section — starts visible

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    // NOTE: SpaceDust lives inside a position:fixed container (SpaceScene).
    // IntersectionObserver always fires isIntersecting=true for fixed elements.
    // Use scroll position instead — pause when SpaceScene fades out (>82% vh).
    const updateVisibility = () => {
      isVisible.current = window.scrollY < window.innerHeight * 0.82
    }
    let tabVisible = !document.hidden
    const onVisibilityChange = () => {
      tabVisible = !document.hidden
      if (tabVisible && isVisible.current && raf === 0) {
        lastT = -1
        raf = requestAnimationFrame(draw)
      }
    }
    const onScroll = () => {
      const wasVisible = isVisible.current
      updateVisibility()
      if (!wasVisible && isVisible.current && tabVisible && raf === 0) {
        lastT = -1
        raf = requestAnimationFrame(draw)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("visibilitychange", onVisibilityChange)

    const W = 420, H = 380
    canvas.width  = W * 2
    canvas.height = H * 2
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(2, 2)

    const N = 120
    const px   = new Float32Array(N)
    const py   = new Float32Array(N)
    const pvx  = new Float32Array(N)
    const pvy  = new Float32Array(N)
    const pr   = new Float32Array(N)
    const pa   = new Float32Array(N)
    const pf   = new Float32Array(N)
    const ph   = new Float32Array(N)
    const pCol = new Uint8Array(N)
    for (let i = 0; i < N; i++) {
      px[i]  = Math.random() * W
      py[i]  = Math.random() * H
      const spd = Math.random() * 0.18 + 0.04
      const ang = Math.random() * Math.PI * 2
      pvx[i] = Math.cos(ang) * spd
      pvy[i] = Math.sin(ang) * spd * 0.55
      pr[i]  = Math.random() * 1.6 + 0.3
      pa[i]  = Math.random() * 0.5 + 0.15
      pf[i]  = Math.random() * 0.8 + 0.15
      ph[i]  = Math.random() * Math.PI * 2
      pCol[i]= Math.floor(Math.random() * 3)
    }
    const COLS = ["#a0c4ff", "#c084fc", "#e8f0ff"]

    let lastT = -1
    let raf   = 0

    // Cache the static nebula gradient — no allocation per frame
    const nb = ctx.createRadialGradient(W * 0.4, H * 0.45, 0, W * 0.4, H * 0.45, W * 0.55)
    nb.addColorStop(0,   "rgba(110,80,220,0.07)")
    nb.addColorStop(0.5, "rgba(60,110,255,0.04)")
    nb.addColorStop(1,   "transparent")

    const draw = (now: number) => {
      const dt = lastT < 0 ? 0 : Math.min((now - lastT) * 0.001, 0.05)
      lastT = now
      const t = now * 0.001

      // Stop the loop entirely when not visible or tab hidden.
      // Listeners will restart it when conditions change.
      if (!isVisible.current || !tabVisible) {
        lastT = -1
        raf = 0
        return
      }

      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = nb
      ctx.fillRect(0, 0, W, H)

      for (let i = 0; i < N; i++) {
        px[i]! = (px[i]! + pvx[i]! * dt * 60 + W) % W
        py[i]! = (py[i]! + pvy[i]! * dt * 60 + H) % H
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * pf[i]! + ph[i]!))
        const op = pa[i]! * tw
        if (op < 0.02) continue

        const col = COLS[pCol[i]!]!
        if (pr[i]! > 1.0) {
          const g = ctx.createRadialGradient(px[i]!, py[i]!, 0, px[i]!, py[i]!, pr[i]! * 3.5)
          g.addColorStop(0, col + "55")
          g.addColorStop(1, "transparent")
          ctx.globalAlpha = op * 0.2
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(px[i]!, py[i]!, pr[i]! * 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = op
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(px[i]!, py[i]!, pr[i]!, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    updateVisibility()
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", onVisibilityChange) }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-[10%] z-[8] hidden opacity-80 md:block"
    />
  )
}

export default function SpaceScene() {
  const { scrollY } = useScroll()
  const [vh, setVh] = useState(800)

  useEffect(() => {
    const up = () => setVh(window.innerHeight)
    up()
    window.addEventListener("resize", up)
    return () => window.removeEventListener("resize", up)
  }, [])

  const smooth = useSpring(scrollY, { stiffness: 75, damping: 20, mass: 0.35 })

  const nebulaY = useTransform(smooth, [0, vh], [0, -30])
  const sunY    = useTransform(smooth, [0, vh], [0, -50])

  const sceneOpacity = useTransform(scrollY, [0, vh * 0.5, vh * 0.82], [1, 1, 0])
  const fogOpacity   = useTransform(scrollY, [vh * 0.32, vh * 0.72, vh * 0.92], [0, 0.75, 1])
  const fogScaleY    = useTransform(scrollY, [vh * 0.32, vh * 0.85], [0.9, 1])

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ opacity: sceneOpacity }}
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Layer 0 — deep space fill */}
        <div className="absolute inset-0 bg-[#020a04]" />

        {/* Layer 1+2 — star canvas */}
        <StarField />

        {/* Layer 2 — nebula colour glows */}
        <motion.div
          aria-hidden="true"
          style={{ y: nebulaY }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute right-[3%] top-[14%] h-[960px] w-[960px] rounded-full blur-[150px]"
            style={{
              background: "radial-gradient(circle, rgba(130,60,230,0.6), transparent 65%)",
              opacity: 0.17,
            }}
          />
          <div
            className="absolute -bottom-[14%] -right-[10%] h-[800px] w-[800px] rounded-full blur-[140px]"
            style={{
              background: "radial-gradient(circle, rgba(40,100,255,0.7), transparent 65%)",
              opacity: 0.13,
            }}
          />
          <div
            className="absolute left-[-6%] top-[38%] h-[520px] w-[520px] rounded-full blur-[120px]"
            style={{
              background: "radial-gradient(circle, rgba(20,170,180,0.4), transparent 65%)",
              opacity: 0.09,
            }}
          />
        </motion.div>

        {/* Layer 4 — warm sun bloom */}
        <motion.div
          aria-hidden="true"
          style={{ y: sunY }}
          className="pointer-events-none absolute right-[20%] top-[22%] h-[500px] w-[500px] rounded-full blur-[100px]"
        >
          <div
            className="h-full w-full rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,215,150,0.65), transparent 58%)" }}
          />
        </motion.div>

        {/* Layer 6 — 3D Earth */}
        <div className="absolute inset-0" style={{ zIndex: 6 }}>
          <EarthScene />
        </div>

        {/* Layer 8 — Space dust cloud */}
        <SpaceDust />

        {/* Layer 12 — orbital objects */}
        <Satellite />
        <Rocket />
        <Astronaut />

        {/* Layer 15 — meteors */}
        <MeteorLayer />

        {/* Layer 18 — film grain */}
        <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.032] mix-blend-overlay" style={{ zIndex: 18 }} />

        {/* Layer 18 — vignette */}
        <div className="vignette pointer-events-none absolute inset-0" style={{ zIndex: 18 }} />
      </motion.div>

      {/* FOG BRIDGE */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: fogOpacity, scaleY: fogScaleY }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-[72vh] origin-bottom"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #000000 0%, rgba(2,3,14,0.97) 16%, rgba(6,5,24,0.88) 36%, rgba(18,8,44,0.55) 62%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 50% at 50% 100%, rgba(35,65,190,0.20) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 40% at 30% 100%, rgba(90,30,185,0.12) 0%, transparent 62%)",
          }}
        />
      </motion.div>
    </>
  )
}
