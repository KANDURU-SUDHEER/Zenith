"use client"

import { useEffect, useState } from "react"

type Meteor = { id: number; top: number; left: number; duration: number }

export default function MeteorLayer() {
  const [meteors, setMeteors] = useState<Meteor[]>([])

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    let timeout: ReturnType<typeof setTimeout>
    let counter = 0

    const fire = () => {
      counter += 1
      const meteor: Meteor = {
        id: counter,
        top: Math.random() * 18,
        left: Math.random() * 28,
        duration: 1.6 + Math.random() * 0.9,
      }
      setMeteors((prev) => [...prev.slice(-1), meteor])
      timeout = setTimeout(fire, (40 + Math.random() * 40) * 1000)
    }

    timeout = setTimeout(fire, 4000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute h-px w-[180px] rounded-full"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(207,224,255,0.9) 70%, #ffffff 100%)",
            boxShadow: "0 0 8px 1px rgba(207,224,255,0.6)",
            animation: `zenith-meteor ${m.duration}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}
