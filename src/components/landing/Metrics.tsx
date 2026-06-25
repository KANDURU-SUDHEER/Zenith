"use client"

import { animate, motion, useInView } from "framer-motion"
import { Satellite, Rocket, Radio, Globe2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const METRICS = [
  { value: 8342, label: "Satellites Tracked" },
  { value: 1529, label: "Active Missions" },
  { value: 42,   label: "Ground Stations" },
  { value: 195,  label: "Countries Covered" },
] as const

const ICONS = [Satellite, Rocket, Radio, Globe2]

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value])

  return <span ref={ref}>{display.toLocaleString()}</span>
}

export default function Metrics() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-5 sm:grid-cols-4">
      {METRICS.map((metric, i) => {
        const Icon = ICONS[i]!
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 + i * 0.1 }}
            className="flex min-w-0 flex-col gap-1"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#00e676]" />
            <span className="break-words text-lg font-extrabold tracking-tight text-white tabular-nums sm:text-2xl lg:text-3xl">
              <Counter value={metric.value} />
            </span>
            <span className="break-words text-[10px] font-medium uppercase leading-tight tracking-wider text-[#6a8870] sm:text-[11px]">
              {metric.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
