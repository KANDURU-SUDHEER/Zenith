import SpaceScene            from "@/components/landing/SpaceScene"
import Navbar               from "@/components/landing/Navbar"
import Hero                 from "@/components/landing/Hero"
import Footer               from "@/components/landing/Footer"
import OrbitalTrackingSection   from "@/components/landing/sections/OrbitalTrackingSection"
import SkyRadarSection          from "@/components/landing/sections/SkyRadarSection"
import SolarSystemSection       from "@/components/landing/sections/SolarSystemSection"
import NasaApodSection          from "@/components/landing/sections/NasaApodSection"
import MissionIntelligenceSection from "@/components/landing/sections/MissionIntelligenceSection"
import WhyZenithSection         from "@/components/landing/sections/WhyZenithSection"
import FinalCTASection          from "@/components/landing/sections/FinalCTASection"

export default function LandingPage() {
  return (
    /*
      Z-INDEX BUDGET
      ─────────────────────────────────────────────────────
      z-[60]  Navbar          — fixed, always on top
      z-30    Hero content    — above space scene
      z-[5]   Fog bridge      — inside SpaceScene
      z-0     SpaceScene      — fixed, full-viewport bg
      z-10    Content sections
      ─────────────────────────────────────────────────────
    */
    <main id="top" className="zenith-root relative min-h-screen overflow-x-hidden">
      <Navbar />
      <SpaceScene />

      {/* Hero — full viewport height */}
      <section className="relative z-30 w-full" style={{ height: "100svh" }}>
        <Hero />
      </section>

      {/* Feature sections — solid dark bg */}
      <div className="relative z-10">
        <OrbitalTrackingSection />
        <SkyRadarSection />
        <SolarSystemSection />
        <NasaApodSection />
        <MissionIntelligenceSection />
        <WhyZenithSection />
        <FinalCTASection />
        <Footer />
      </div>
    </main>
  )
}
