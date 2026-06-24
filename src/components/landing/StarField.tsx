"use client"

import { useEffect, useRef } from "react"

/* ─────────────────────────────────────────────────────────────────
   PROCEDURAL STARFIELD
   Three depth layers, each with different:
     • size range          • brightness range
     • drift speed         • twinkle frequency
     • parallax multiplier
   ───────────────────────────────────────────────────────────────── */

interface StarData {
  x: Float32Array
  y: Float32Array
  r: Float32Array
  alpha: Float32Array
  freq: Float32Array
  phase: Float32Array
  vx: Float32Array
  vy: Float32Array
  colorIdx: Uint8Array
  count: number
}

const LAYERS = [
  { count: 350, rMin: 0.12, rMax: 0.55, aMin: 0.12, aMax: 0.42, vMax: 0.18, freqMin: 0.12, freqMax: 0.50, parallax: 0.04 },
  { count: 220, rMin: 0.35, rMax: 1.00, aMin: 0.22, aMax: 0.62, vMax: 0.60, freqMin: 0.28, freqMax: 0.95, parallax: 0.10 },
  { count: 120, rMin: 0.70, rMax: 2.40, aMin: 0.50, aMax: 1.00, vMax: 1.60, freqMin: 0.55, freqMax: 2.00, parallax: 0.22 },
]

const PALETTES = [
  ["#c8d8ff", "#dde8ff", "#ffffff", "#b8ccff"],
  ["#d8e8ff", "#ffffff", "#ffe8c8", "#c8d8ff", "#e8f0ff"],
  ["#ffffff", "#ffeedd", "#d8eeff", "#eeddff", "#c8ffee"],
]

function makeBatch(cfg: typeof LAYERS[0], width: number, height: number): StarData {
  const n = cfg.count
  const x        = new Float32Array(n)
  const y        = new Float32Array(n)
  const r        = new Float32Array(n)
  const alpha    = new Float32Array(n)
  const freq     = new Float32Array(n)
  const phase    = new Float32Array(n)
  const vx       = new Float32Array(n)
  const vy       = new Float32Array(n)
  const colorIdx = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    x[i]        = Math.random() * width
    y[i]        = Math.random() * height
    r[i]        = cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin)
    alpha[i]    = cfg.aMin + Math.random() * (cfg.aMax - cfg.aMin)
    freq[i]     = cfg.freqMin + Math.random() * (cfg.freqMax - cfg.freqMin)
    phase[i]    = Math.random() * Math.PI * 2
    const speed = Math.random() * cfg.vMax
    const angle = Math.random() * Math.PI * 2
    vx[i]       = Math.cos(angle) * speed
    vy[i]       = Math.sin(angle) * speed * 0.5
    colorIdx[i] = Math.floor(Math.random() * (PALETTES[0]?.length ?? 4))
  }

  return { x, y, r, alpha, freq, phase, vx, vy, colorIdx, count: n }
}

export default function StarField() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const scrollRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const dpr     = Math.min(window.devicePixelRatio || 1, 2)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let W = 0, H = 0
    let batches: StarData[] = []
    let raf    = 0
    let lastT  = -1
    let isVisible = true
    let tabVisible = !document.hidden

    // NOTE: StarField lives inside a position:fixed container (SpaceScene).
    // IntersectionObserver always fires isIntersecting=true for fixed elements,
    // so we use scroll position instead — pause when SpaceScene fades out (>82% vh).
    const updateVisibility = () => {
      const vh = window.innerHeight
      isVisible = scrollRef.current < vh * 0.82
    }

    const onVisibilityChange = () => {
      tabVisible = !document.hidden
      if (tabVisible && isVisible && raf === 0) {
        lastT = -1
        raf = requestAnimationFrame(render)
      }
    }

    const build = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width        = Math.round(W * dpr)
      canvas.height       = Math.round(H * dpr)
      canvas.style.width  = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      batches = LAYERS.map((cfg) => makeBatch(cfg, W, H))
    }

    const render = (now: number) => {
      // Stop the loop entirely when not visible or tab is hidden.
      // The scroll/visibilitychange listeners will restart it.
      if (!isVisible || !tabVisible) {
        lastT = -1 // reset dt so first visible frame doesn't get a huge jump
        raf = 0
        return
      }

      const dt = lastT < 0 ? 0 : Math.min((now - lastT) * 0.001, 0.05)
      lastT    = now

      const scrollY = scrollRef.current
      const t       = now * 0.001

      ctx.clearRect(0, 0, W, H)

      for (let li = 0; li < batches.length; li++) {
        const b        = batches[li]!
        const palette  = PALETTES[li]!
        const pSpeed   = LAYERS[li]!.parallax
        const scrollOff = -scrollY * pSpeed

        for (let i = 0; i < b.count; i++) {
          if (!reduced) {
            b.x[i]! += b.vx[i]! * dt
            b.y[i]! += b.vy[i]! * dt
            if (b.x[i]! < 0)  b.x[i]! += W
            if (b.x[i]! > W)  b.x[i]! -= W
            if (b.y[i]! < 0)  b.y[i]! += H
            if (b.y[i]! > H)  b.y[i]! -= H
          }

          const twinkle = reduced
            ? 1
            : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * b.freq[i]! + b.phase[i]!))

          const opacity = b.alpha[i]! * twinkle
          if (opacity < 0.02) continue

          const drawX = b.x[i]!
          let   drawY = b.y[i]! + scrollOff
          drawY = ((drawY % H) + H) % H

          const color = palette[b.colorIdx[i]! % palette.length]!
          const rad   = b.r[i]!

          if (li === 2 && rad > 1.3) {
            const g = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, rad * 4)
            g.addColorStop(0,   color)
            g.addColorStop(0.4, color)
            g.addColorStop(1,   "rgba(0,0,0,0)")
            ctx.globalAlpha = opacity * 0.18
            ctx.fillStyle   = g
            ctx.beginPath()
            ctx.arc(drawX, drawY, rad * 4, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.globalAlpha = opacity
          ctx.fillStyle   = color
          ctx.beginPath()
          ctx.arc(drawX, drawY, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(render)
    }

    const onScroll = () => {
      const wasVisible = isVisible
      scrollRef.current = window.scrollY
      updateVisibility()
      // Resume RAF if we scrolled back into view
      if (!wasVisible && isVisible && tabVisible && raf === 0) {
        lastT = -1
        raf = requestAnimationFrame(render)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const onResize = () => {
      build()
      lastT = -1
      updateVisibility()
      if (reduced) render(0)
    }
    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", onVisibilityChange)

    build()
    updateVisibility()
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  )
}
