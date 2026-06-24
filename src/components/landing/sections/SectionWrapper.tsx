"use client"

import { motion } from "framer-motion"

interface SectionWrapperProps {
  id?: string
  children: React.ReactNode
  className?: string
  /** Use tighter vertical padding */
  tight?: boolean
  /** Top bleed colour for section transition (defaults to blue) */
  bleedColor?: string
}

/**
 * Shared wrapper for every feature section.
 * Tightened from py-28/py-36 to py-16/py-24 to remove dead space.
 * Top gradient bleed creates visual continuity between sections.
 */
export default function SectionWrapper({
  id,
  children,
  className = "",
  tight,
  bleedColor = "rgba(10,6,24,0.8)",
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden bg-[#020a04] ${tight ? "py-8 sm:py-10 md:py-14" : "py-10 sm:py-14 md:py-20"} ${className}`}
    >
      {/* Top gradient bleed — ties sections together visually */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
        style={{
          background: `linear-gradient(to bottom, ${bleedColor} 0%, transparent 100%)`,
        }}
      />
      {/* Bottom fade — smooth exit into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[80px]"
        style={{
          background: "linear-gradient(to top, rgba(2,3,10,0.5) 0%, transparent 100%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {children}
      </div>
    </section>
  )
}

/** Scroll-triggered fade+rise — reduced y travel for tighter feel */
export function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#00e676]">
      {children}
    </p>
  )
}

export function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-balance font-black leading-[1.05] tracking-[-0.03em] text-white"
      style={{ fontSize: "clamp(1.65rem, 3.2vw, 2.75rem)" }}
    >
      {children}
    </h2>
  )
}

export function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 max-w-[52ch] text-sm leading-[1.8] text-[#80a888] md:text-[0.95rem]">
      {children}
    </p>
  )
}

export function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">
      <span className="text-[#00e676]">{icon}</span>
      <span className="text-xs font-medium text-[#a0b8a8]">{label}</span>
    </div>
  )
}

export function DataCard({
  value,
  label,
  sub,
  accent = "#00e676",
}: {
  value: string
  label: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[#6a8870]">{sub}</div>}
    </div>
  )
}
