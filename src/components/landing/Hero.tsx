"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Metrics from "@/components/landing/Metrics"

const ease = [0.16, 1, 0.3, 1] as const

function MagneticCTA() {
  return (
    <button
      type="button"
      className="btn-zenith-primary group relative inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold text-white sm:h-14 sm:w-auto sm:max-w-none sm:px-7"
      onClick={() => window.location.href = "/zenith"}
    >
      <span className="relative z-10 flex items-center gap-2">
        Explore Dashboard
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </button>
  )
}

export default function Hero() {
  const { scrollY } = useScroll()

  const contentY = useTransform(scrollY, [0, 600], [0, -40])
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0])

  return (
    <motion.div
      style={{ y: contentY, opacity: contentOpacity }}
      className="relative z-30 flex h-full w-full min-w-0 items-center justify-center overflow-hidden px-4 sm:px-6 lg:w-[50%] lg:justify-start lg:overflow-visible lg:px-10 xl:pl-16"
    >
      <div className="w-full max-w-[580px] pb-8 pt-[80px] sm:pt-[88px] text-center lg:text-left">
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease, delay: 0.05 }}
          className="w-full max-w-full break-words font-sans font-black leading-[0.95] tracking-[-0.03em] text-white text-balance"
          style={{ fontSize: "clamp(1.85rem, 9vw, 4.2rem)", overflowWrap: "break-word" }}
        >
          See <span className="text-gradient-zenith">Everything.</span>
          <br />
          Know <span className="text-gradient-zenith">Everything.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.2 }}
          className="mx-auto mt-5 w-full max-w-full break-words text-sm leading-[1.75] text-[#a0b8a8] sm:max-w-[460px] sm:text-base md:text-lg lg:mx-0"
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          A real-time orbital intelligence platform. Track every satellite, mission and signal across the planet from one cinematic command center.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.35 }}
          className="mt-8 flex justify-center lg:justify-start"
        >
          <MagneticCTA />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.5 }}
          className="mt-8"
        >
          <Metrics />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-8 flex items-center justify-center gap-2.5 lg:justify-start"
        >
          <motion.div
            className="flex h-7 w-4 items-start justify-center rounded-full border border-white/20 p-1"
            aria-hidden="true"
          >
            <motion.div
              className="h-1.5 w-1 rounded-full bg-[#00e676]"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <a href="#globe" className="text-xs font-medium text-[#6c7a90] hover:text-[#a0b8a8] transition-colors">
            Scroll to explore the universe
          </a>
        </motion.div>
      </div>
    </motion.div>
  )
}
