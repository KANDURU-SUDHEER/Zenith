"use client"

import { motion } from "framer-motion"
import { X, Check, ArrowRight } from "lucide-react"
import SectionWrapper, { FadeUp, SectionEyebrow, SectionHeadline } from "./SectionWrapper"

const OLD = [
  "Static snapshots — no live updates",
  "Fragmented across 10+ separate sites",
  "No interactivity or exploration",
  "Text-heavy, hard to parse",
  "No integration between tools",
  "No orbital path prediction",
  "No sky radar for your location",
  "No mission intelligence layer",
]

const NEW = [
  "Live data — updated every second",
  "Everything unified in one platform",
  "Full 3D interactive experience",
  "Cinematic visual intelligence",
  "All modules cross-referenced",
  "72-hour orbital prediction engine",
  "Location-aware sky radar",
  "AI-ready mission analytics",
]

export default function WhyZenithSection() {
  return (
    <SectionWrapper id="about" tight className="pb-8 md:pb-12" bleedColor="rgba(6,3,15,0.6)">
      <FadeUp className="mx-auto text-center">
        <SectionEyebrow>Why Zenith</SectionEyebrow>
        <SectionHeadline>
          The World Was Watching Space.{" "}
          <span className="text-gradient-zenith">Nobody Was Listening.</span>
        </SectionHeadline>
        <p className="mt-4 text-[0.82rem] leading-[1.8] text-[#80a888] md:text-[0.88rem]">
          Traditional space-tracking sites give you fragments. Zenith gives you the complete picture — unified, real-time, and cinematic.
        </p>
      </FadeUp>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <FadeUp delay={0.1}>
          <div className="relative overflow-hidden rounded-3xl border border-red-500/15 bg-red-500/[0.03] p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <div className="text-base font-bold text-white">Traditional Space Sites</div>
                <div className="text-xs text-red-400/70">Fragmented experience</div>
              </div>
            </div>
            <ul className="space-y-3">
              {OLD.map((item, i) => (
                <motion.li key={item}
                  initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15+i*0.05, duration: 0.45, ease: [0.16,1,0.3,1] }}
                  className="flex items-start gap-3 text-sm text-[#6a8870]">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500/60" />{item}
                </motion.li>
              ))}
            </ul>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="relative overflow-hidden rounded-3xl border border-[#00e676]/20 bg-[#00e676]/[0.04] p-8">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #00e676, #00c853, transparent)" }} />
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#00e676]/30 bg-[#00e676]/15">
                <Check className="h-5 w-5 text-[#00e676]" />
              </div>
              <div>
                <div className="text-base font-bold text-white">Project Zenith</div>
                <div className="text-xs text-[#00e676]/80">Unified intelligence</div>
              </div>
            </div>
            <ul className="space-y-3">
              {NEW.map((item, i) => (
                <motion.li key={item}
                  initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15+i*0.05, duration: 0.45, ease: [0.16,1,0.3,1] }}
                  className="flex items-start gap-3 text-sm text-[#a0b8a8]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6effa8]" />{item}
                </motion.li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </div>

      <FadeUp delay={0.35} className="mt-8 flex justify-center">
        <div className="flex items-center gap-2 text-sm text-[#00e676]">
          <span>See the difference for yourself</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </FadeUp>
    </SectionWrapper>
  )
}
