"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"

export default function Satellite() {
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 900], [0, -45])
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: "0px 0px 0px 0px", amount: 0.01 })

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      data-zenith-float
      style={{ y: parallaxY }}
      className="pointer-events-none absolute right-[5%] top-[22%] z-[12] hidden md:block"
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      <motion.div
        animate={inView ? {
          x: [0, -26,  12, -16,  22, 0],
          y: [0,  16, -10,  20, -8,  0],
        } : false}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        }}
      >
        <motion.div
          animate={inView ? { rotate: [5, 12, 3, 10, 5] } : false}
          transition={{
            duration: 32,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div className="relative">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00e676]"
                initial={{ width: 0, height: 0, opacity: 0 }}
                animate={inView ? {
                  width:   ["0px", "110px"],
                  height:  ["0px", "110px"],
                  opacity: [0.65, 0],
                } : false}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: i * 0.75,
                  ease: "easeOut",
                  repeatDelay: 3.5,
                }}
              />
            ))}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-full h-40 w-36 -translate-x-1/2"
              style={{
                background:
                  "conic-gradient(from 198deg at 50% 0%, transparent 0deg, rgba(0,230,118,0.05) 22deg, transparent 44deg)",
              }}
            />
            <motion.span
              className="absolute right-2 top-3 z-10 h-2 w-2 rounded-full bg-[#6effa8]"
              style={{ boxShadow: "0 0 10px 3px rgba(110,255,168,0.9)" }}
              animate={inView ? { opacity: [0.12, 1, 0.12], scale: [0.75, 1.25, 0.75] } : false}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute bottom-3 left-3 z-10 h-1.5 w-1.5 rounded-full bg-[#ffb347]"
              style={{ boxShadow: "0 0 7px 2px rgba(255,180,70,0.85)" }}
              animate={inView ? { opacity: [0.15, 1, 0.15] } : false}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/objects/satellite.png"
              alt=""
              className="space-object relative z-10 h-[88px] w-auto select-none drop-shadow-[0_8px_32px_rgba(0,230,118,0.45)]"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
