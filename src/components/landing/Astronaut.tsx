"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"

export default function Astronaut() {
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 900], [0, -70])
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: "0px 0px 0px 0px", amount: 0.01 })

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      data-zenith-float
      style={{ y: parallaxY }}
      className="pointer-events-none absolute bottom-[8%] left-[40%] z-[12] hidden lg:block xl:left-[44%]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.93, scale: 1 }}
      transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        animate={inView ? {
          x: [0, 22, -12,  8, -20, 0],
          y: [0, -18, 10, -6,  14, 0],
        } : false}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.22, 0.44, 0.64, 0.82, 1],
        }}
      >
        <motion.div
          animate={inView ? { rotate: [-17, -12, -21, -15, -19, -17] } : false}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.45, 0.65, 0.84, 1],
          }}
        >
          <div className="relative">
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-4 left-1/2 h-24 w-14 -translate-x-1/2 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(0,230,118,0.95) 0%, rgba(0,200,83,0.45) 50%, transparent 80%)",
              }}
              animate={inView ? {
                opacity: [0.22, 0.72, 0.32, 0.88, 0.22],
                scaleX:  [0.75, 1.1,  0.88, 1.18, 0.75],
                scaleY:  [0.65, 1.0,  0.82, 1.12, 0.65],
              } : false}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -inset-4 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 42% 38%, rgba(0,230,118,0.15), transparent 68%)",
              }}
              animate={inView ? { opacity: [0.35, 0.85, 0.35] } : false}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/objects/astronaut.png"
              alt=""
              className="space-object relative z-10 h-[210px] w-auto select-none drop-shadow-[0_20px_55px_rgba(0,0,0,0.75)]"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
