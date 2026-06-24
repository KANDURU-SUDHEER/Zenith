"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"

export default function Rocket() {
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 900], [0, -55])
  const ref = useRef<HTMLDivElement>(null)
  // Pause Framer Motion loops when scrolled out of view
  const inView = useInView(ref, { margin: "0px 0px 0px 0px", amount: 0.01 })

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      data-zenith-float
      style={{ y: parallaxY }}
      className="pointer-events-none absolute bottom-[16%] right-[9%] z-[12] hidden md:block"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
    >
      <motion.div
        animate={inView ? {
          x: [0, 12, -7, 16, -9,  0],
          y: [0, -18, 9, -14, 7, 0],
        } : false}
        transition={{
          duration: 34,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        }}
      >
        <motion.div
          animate={inView ? { rotate: [15, 21, 12, 19, 15] } : false}
          transition={{
            duration: 27,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <div className="relative">
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-9 left-1/2 h-28 w-7 -translate-x-1/2 rounded-full blur-md"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,220,100,0.98), rgba(0,230,118,0.75), rgba(0,200,83,0.28), transparent)",
              }}
              animate={inView ? {
                opacity: [0.5, 1.0, 0.55, 0.98, 0.5],
                scaleY:  [0.72, 1.35, 0.88, 1.22, 0.72],
                scaleX:  [0.82, 1.12, 0.9, 1.06, 0.82],
              } : false}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-7 left-1/2 h-20 w-16 -translate-x-1/2 rounded-full blur-xl"
              style={{
                background: "radial-gradient(ellipse at top, rgba(0,230,118,0.55), transparent 68%)",
              }}
              animate={inView ? { opacity: [0.28, 0.72, 0.28], scale: [0.88, 1.22, 0.88] } : false}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.22 }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/objects/rocket.png"
              alt=""
              className="space-object relative z-10 h-[96px] w-auto select-none drop-shadow-[0_8px_32px_rgba(0,230,118,0.38)]"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
