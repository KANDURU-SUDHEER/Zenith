"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Calendar, BookOpen, ImageIcon } from "lucide-react"
import SectionWrapper, {
  FadeUp, SectionEyebrow, SectionHeadline, SectionBody
} from "./SectionWrapper"

const APODS = [
  {
    title: "Pillars of Creation",
    date: "April 14, 2024",
    category: "Nebula",
    desc: "The Eagle Nebula's iconic columns of gas and dust photographed by the James Webb Space Telescope in near-infrared, revealing thousands of never-before-seen stars forming within the pillars.",
    gradient: "from-[#061808] via-[#071a0a] to-[#0a0d1a]",
    accent: "#00c853",
    stars: "★★★★★",
    scene: "nebula" as const,
  },
  {
    title: "Aurora Over Iceland",
    date: "March 28, 2024",
    category: "Aurora",
    desc: "A powerful G4 geomagnetic storm painted the skies over Vatnajökull glacier in shifting curtains of green and violet — a solar wind encounter with Earth's magnetic field made visible.",
    gradient: "from-[#001a0d] via-[#00261a] to-[#011408]",
    accent: "#6effa8",
    stars: "★★★★★",
    scene: "aurora" as const,
  },
  {
    title: "Black Hole Shadow M87",
    date: "April 10, 2019",
    category: "Black Hole",
    desc: "The first ever direct image of a black hole — the shadow of M87's supermassive black hole, 6.5 billion solar masses, captured by the Event Horizon Telescope collaboration.",
    gradient: "from-[#1a0800] via-[#2a0e00] to-[#0a0500]",
    accent: "#ffd2a0",
    stars: "★★★★★",
    scene: "blackhole" as const,
  },
]

type Scene = "nebula" | "aurora" | "blackhole"

function SceneCanvas({ scene, accent }: { scene: Scene; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const isVisible = useRef(false)

  const startScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Each invocation creates its own fresh observer — no stale-canvas bug.
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible.current = entries[0]?.isIntersecting ?? false
        // Resume the RAF loop if we just became visible and it had stopped.
        if (isVisible.current && rafRef.current === 0) {
          rafRef.current = requestAnimationFrame(runDraw)
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(canvas)
    isVisible.current = false

    const W = canvas.offsetWidth  || 600
    const H = canvas.offsetHeight || 320
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = W * DPR
    canvas.height = H * DPR
    ctx.scale(DPR, DPR)

    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0

    // Each scene returns a draw function. We wrap it in a common runner that
    // stops the RAF entirely when offscreen rather than idling at 60fps.
    let drawFn: (now: number) => void

    if (scene === "nebula") {
      const N = 180
      const sx = Array.from({ length: N }, (_, i) => ((i * 7919 + 1234) % 10000) / 10000 * W)
      const sy = Array.from({ length: N }, (_, i) => ((i * 6271 + 5678) % 10000) / 10000 * H)
      const sr = Array.from({ length: N }, (_, i) => 0.3 + (i % 5) * 0.18)
      const sa = Array.from({ length: N }, (_, i) => 0.2 + (i % 6) * 0.13)
      const sPhase = Array.from({ length: N }, (_, i) => i * 0.4)
      const pillars = [
        { x: W * 0.28, w: W * 0.07, h: H * 0.72, color: "#3a1a6e" },
        { x: W * 0.44, w: W * 0.06, h: H * 0.85, color: "#2a1050" },
        { x: W * 0.60, w: W * 0.05, h: H * 0.65, color: "#3a1a6e" },
      ]
      drawFn = (now: number) => {
        const bg = ctx.createLinearGradient(0, 0, 0, H)
        bg.addColorStop(0, "#03100a"); bg.addColorStop(1, "#061408")
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
        const t2 = now * 0.0003
        for (const c of [
          { x: W*0.35, y: H*0.3, rx: W*0.55, ry: H*0.45, alpha: 0.08+0.03*Math.sin(t2) },
          { x: W*0.65, y: H*0.5, rx: W*0.40, ry: H*0.35, alpha: 0.06+0.02*Math.sin(t2+1) },
          { x: W*0.20, y: H*0.6, rx: W*0.35, ry: H*0.30, alpha: 0.05+0.02*Math.sin(t2+2) },
        ]) {
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(c.rx, c.ry))
          g.addColorStop(0, `rgba(0,200,83,${c.alpha})`); g.addColorStop(0.5, `rgba(110,60,200,${c.alpha*0.4})`); g.addColorStop(1, "transparent")
          ctx.save(); ctx.scale(1, c.ry/c.rx); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c.x, c.y*(c.rx/c.ry), c.rx, 0, Math.PI*2); ctx.fill(); ctx.restore()
        }
        for (let i = 0; i < N; i++) {
          const tw = sa[i]! * (0.5 + 0.5 * Math.sin(now * 0.001 + sPhase[i]!))
          ctx.globalAlpha = tw; ctx.fillStyle = i%7===0 ? accent : "#ffffff"
          ctx.beginPath(); ctx.arc(sx[i]!, sy[i]!, sr[i]!, 0, Math.PI*2); ctx.fill()
        }
        ctx.globalAlpha = 1
        for (const p of pillars) {
          const pg = ctx.createLinearGradient(p.x, H-p.h, p.x, H)
          pg.addColorStop(0, p.color+"00"); pg.addColorStop(0.3, p.color+"cc"); pg.addColorStop(1, p.color+"ff")
          ctx.fillStyle=pg; ctx.fillRect(p.x, H-p.h, p.w, p.h)
        }
      }
    } else if (scene === "aurora") {
      const N = 120
      const sx = Array.from({ length: N }, (_, i) => ((i*7919+1234)%10000)/10000*W)
      const sy = Array.from({ length: N }, (_, i) => ((i*6271+5678)%10000)/10000*H)
      const sr = Array.from({ length: N }, (_, i) => 0.3+(i%4)*0.2)
      const sPhase = Array.from({ length: N }, (_, i) => i*0.38)
      const curtains = [
        { xBase:0.1, w:0.25, phase:0,   c1:"#00ff88", c2:"#00cc66" },
        { xBase:0.3, w:0.20, phase:0.8, c1:"#00ffaa", c2:"#4dffb3" },
        { xBase:0.5, w:0.22, phase:1.6, c1:"#44ffcc", c2:"#00ff88" },
        { xBase:0.68,w:0.18, phase:2.4, c1:"#7b2fff", c2:"#5500dd" },
        { xBase:0.82,w:0.15, phase:3.1, c1:"#00ff88", c2:"#00cc44" },
      ]
      drawFn = (now: number) => {
        const bg = ctx.createLinearGradient(0,0,0,H)
        bg.addColorStop(0,"#000d08"); bg.addColorStop(0.6,"#001208"); bg.addColorStop(1,"#001a0a")
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H)
        for (let i=0;i<N;i++) {
          ctx.globalAlpha=0.15+0.15*Math.sin(now*0.0008+sPhase[i]!)
          ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(sx[i]!,sy[i]!*0.5,sr[i]!,0,Math.PI*2); ctx.fill()
        }
        ctx.globalAlpha=1
        const t3=now*0.0006
        for (const c of curtains) {
          const wave=Math.sin(t3+c.phase)*0.06, x=(c.xBase+wave)*W
          const topY=H*(0.05+0.08*Math.sin(t3*0.7+c.phase)), botY=H*(0.55+0.08*Math.sin(t3*0.5+c.phase+1))
          const alpha=0.45+0.18*Math.sin(t3*0.9+c.phase)
          const cg=ctx.createLinearGradient(x,topY,x,botY)
          cg.addColorStop(0,"transparent"); cg.addColorStop(0.15,c.c1+Math.round(alpha*180).toString(16).padStart(2,"0"))
          cg.addColorStop(0.5,c.c2+Math.round(alpha*220).toString(16).padStart(2,"0")); cg.addColorStop(1,"transparent")
          ctx.fillStyle=cg; const cw=c.w*W*(0.85+0.15*Math.sin(t3+c.phase))
          ctx.beginPath(); ctx.ellipse(x+cw/2,(topY+botY)/2,cw/2,(botY-topY)/2,0,0,Math.PI*2); ctx.fill()
        }
        ctx.fillStyle="#000a04"; ctx.fillRect(0,H*0.82,W,H*0.18)
      }
    } else {
      const cx=W*0.5, cy=H*0.5, N=150
      const sx2=Array.from({length:N},(_,i)=>((i*7919+1234)%10000)/10000*W)
      const sy2=Array.from({length:N},(_,i)=>((i*6271+5678)%10000)/10000*H)
      const sr2=Array.from({length:N},(_,i)=>0.3+(i%5)*0.18)
      const sPhase=Array.from({length:N},(_,i)=>i*0.42)
      const DISK=300, SHADOW_R=Math.min(W,H)*0.14
      const diskAngle=Array.from({length:DISK},(_,i)=>(i/DISK)*Math.PI*2)
      const diskR=Array.from({length:DISK},(_,i)=>Math.min(W,H)*(0.22+(i%7)*0.025))
      const diskSpeed=Array.from({length:DISK},(_,i)=>0.004+(i%5)*0.002)
      const diskAlpha=Array.from({length:DISK},(_,i)=>0.5+(i%3)*0.17)
      const diskColor=Array.from({length:DISK},(_,i)=>i/DISK<0.33?"#ff6a00":i/DISK<0.66?"#ff9500":"#ffcc44")
      let lastT = -1
      drawFn = (now: number) => {
        const dt = lastT < 0 ? 0.016 : Math.min((now - lastT) / 1000, 0.05)
        lastT = now
        ctx.clearRect(0,0,W,H); ctx.fillStyle="#03010a"; ctx.fillRect(0,0,W,H)
        for (let i=0;i<N;i++) {
          ctx.globalAlpha=0.15+0.2*Math.sin(now*0.0007+sPhase[i]!)
          ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(sx2[i]!,sy2[i]!,sr2[i]!,0,Math.PI*2); ctx.fill()
        }
        ctx.globalAlpha=1
        ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.32)
        for (let i=0;i<DISK;i++) {
          diskAngle[i] = (diskAngle[i]! + diskSpeed[i]! * dt) % (Math.PI * 2)
          const dx=Math.cos(diskAngle[i]!)*diskR[i]!, dy=Math.sin(diskAngle[i]!)*diskR[i]!
          ctx.globalAlpha=diskAlpha[i]!*0.7; ctx.fillStyle=diskColor[i]!
          ctx.beginPath(); ctx.arc(dx,dy,1.8,0,Math.PI*2); ctx.fill()
        }
        ctx.globalAlpha=1; ctx.restore()
        const pGlow=ctx.createRadialGradient(cx,cy,SHADOW_R*0.9,cx,cy,SHADOW_R*1.3)
        pGlow.addColorStop(0,"rgba(255,120,0,0.55)"); pGlow.addColorStop(1,"transparent")
        ctx.fillStyle=pGlow; ctx.beginPath(); ctx.arc(cx,cy,SHADOW_R*1.3,0,Math.PI*2); ctx.fill()
        ctx.fillStyle="#000000"; ctx.beginPath(); ctx.arc(cx,cy,SHADOW_R,0,Math.PI*2); ctx.fill()
      }
    }

    // Common RAF runner — stops entirely when offscreen; IO callback restarts it.
    const runDraw = (now: number) => {
      if (!isVisible.current) {
        rafRef.current = 0
        return
      }
      ctx.clearRect(0, 0, W, H)
      drawFn(now)
      rafRef.current = requestAnimationFrame(runDraw)
    }

    // Only start if currently visible (IO may not fire immediately)
    if (isVisible.current) {
      rafRef.current = requestAnimationFrame(runDraw)
    }

    // Return cleanup so the outer useEffect can tear down the observer
    return () => { observer.disconnect() }
  }, [scene, accent])

  useEffect(() => {
    const cleanup = startScene()
    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      cleanup?.()
    }
  }, [startScene])

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
}

function ApodCard({ apod }: { apod: typeof APODS[0] }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${apod.gradient} border border-white/10`}>
      <div className="relative h-[280px] overflow-hidden md:h-[340px]">
        <SceneCanvas scene={apod.scene} accent={apod.accent} />
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-[#fc3d21]" />
          <span className="text-[10px] font-bold tracking-[0.15em] text-white">NASA APOD</span>
        </div>
        <div
          className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold"
          style={{ background: apod.accent+"30", color: apod.accent, border: `1px solid ${apod.accent}40` }}
        >
          {apod.category}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white">{apod.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6a8870]">
              <Calendar className="h-3 w-3" /><span>{apod.date}</span>
            </div>
          </div>
          <span className="shrink-0 text-xs" style={{ color: apod.accent }}>{apod.stars}</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#80a888]">{apod.desc}</p>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium" style={{ color: apod.accent }}>
          <BookOpen className="h-3.5 w-3.5" />Read scientific explanation
        </div>
      </div>
    </div>
  )
}

export default function NasaApodSection() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    // Respect reduced motion — don't auto-advance if user prefers it
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = () => {
      // Don't advance when tab is hidden
      if (!document.hidden) {
        setCurrent((c) => (c + 1) % APODS.length)
      }
    }

    const t = setInterval(tick, 7000)
    return () => clearInterval(t)
  }, [])

  return (
    <SectionWrapper id="apod">
      <div className="grid items-start gap-10 lg:gap-16 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24">
          <FadeUp>
            <SectionEyebrow>NASA Integration</SectionEyebrow>
            <SectionHeadline>
              Discover The Universe{" "}
              <span className="text-gradient-zenith">Every Day</span>
            </SectionHeadline>
            <SectionBody>
              Zenith pipes in NASA&apos;s Astronomy Picture of the Day — cinematic space imagery, expert scientific explanations, and a full historical archive. Every day a new window opens to the cosmos.
            </SectionBody>
          </FadeUp>
          <div className="mt-8 grid gap-3">
            {[
              { icon: <ImageIcon className="h-4 w-4" />, title: "Daily NASA Updates",        desc: "Fresh APOD delivered automatically every 24 hours, zero setup." },
              { icon: <Star className="h-4 w-4" />,      title: "High-Resolution Imagery",   desc: "Full-resolution images from Hubble, JWST, Chandra, and ground telescopes." },
              { icon: <BookOpen className="h-4 w-4" />,  title: "Scientific Explanations",   desc: "Peer-reviewed descriptions authored by professional astronomers." },
              { icon: <Calendar className="h-4 w-4" />,  title: "Historical Archive Access", desc: "Browse every APOD since June 16, 1995 — over 10,000 images." },
            ].map((f, i) => (
              <FadeUp key={f.title} delay={0.08+i*0.07}>
                <div className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ffd2a0]/10 text-[#ffd2a0]">{f.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-[#6a8870]">{f.desc}</div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.4} className="mt-5 flex gap-2">
            {APODS.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i===current?"w-6 bg-[#00e676]":"w-1.5 bg-white/20"}`}
                aria-label={`Show APOD ${i+1}`} />
            ))}
          </FadeUp>
        </div>
        <FadeUp delay={0.1} className="relative">
          <AnimatePresence mode="wait">
            <motion.div key={current}
              initial={{ opacity:0, y:20, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-20, scale:0.97 }}
              transition={{ duration:0.6, ease:[0.16,1,0.3,1] }}>
              <ApodCard apod={APODS[current]!} />
            </motion.div>
          </AnimatePresence>
          <FadeUp delay={0.3} className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {APODS.map((a, i) => (
              <button key={a.title} onClick={() => setCurrent(i)}
                className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${a.gradient} p-2.5 sm:p-3 text-left transition-all duration-200 ${i===current?"border-white/20 scale-[1.02]":"border-white/6 opacity-60 hover:opacity-80"}`}>
                <div className="text-[10px] font-semibold text-white truncate">{a.title}</div>
                <div className="mt-0.5 text-[9px]" style={{ color: a.accent }}>{a.category}</div>
              </button>
            ))}
          </FadeUp>
        </FadeUp>
      </div>
    </SectionWrapper>
  )
}
