"use client";

import { useRef, useLayoutEffect } from "react";
import { Clock, Sun, Moon, Globe2, Sparkles, Stars } from "lucide-react";
import { useLocationStore } from "@/stores/location-store";
import { useSearchStore } from "@/stores/search-store";
import { useISSTracker } from "@/hooks/use-iss-tracker";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import { useConstellations } from "@/hooks/use-constellations";
import { ISSDetailPanel } from "./iss-detail-panel";
import { SatelliteDetailPanel } from "./satellite-detail-panel";
import { MoonExplorer } from "@/components/solar-system/moon-explorer";
import { CONSTELLATIONS } from "@/services/constellations-data";

export function DetailsPanel() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const selectedResult = useSearchStore((s) => s.selectedResult);

  // ISS data is NOT pulled here — ISSDetailPanel pulls it directly.
  // This prevents DetailsPanel from re-rendering at 60fps due to ISS animation.
  const { nextPass } = useISSTracker();

  // Only fetch celestial data when a location is selected
  const { sun: sunData, moon: moonData, planets: planetsData } = useCelestialEngine();
  const { data: constellations } = useConstellations();

  const visiblePlanets = selectedLocation ? (planetsData?.filter((p) => p.isVisible) ?? []) : [];
  const visibleConstellations = selectedLocation ? (constellations?.filter((c) => c.isVisible) ?? []) : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = scrollPositionRef.current;
    const handleScroll = () => { scrollPositionRef.current = element.scrollTop; };
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  });

  const highlightedPlanet = selectedResult?.type === "planet"
    ? planetsData?.find((p) => p.name.toLowerCase() === selectedResult.name.toLowerCase()) ?? null
    : null;

  const highlightedConstellation = selectedResult?.type === "constellation"
    ? CONSTELLATIONS.find((c) => c.name.toLowerCase() === selectedResult.name.toLowerCase()) ?? null
    : null;

  return (
    <aside className="flex h-full w-64 flex-col overflow-hidden border-l border-[rgba(255,255,255,0.06)] bg-[#0D0E10] md:w-72 lg:w-80">
      {/* Panel Header */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#111215] px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#75777D]">Mission Data</h2>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-5"
        style={{ scrollBehavior: "auto", willChange: "scroll-position" }}
      >
        {/* Selected Satellite Detail — always visible */}
        <SatelliteDetailPanel />

        {/* Moon Explorer — shows moons when a planet is selected in Solar System */}
        <MoonExplorer />

        {/* ISS Panel — always visible, no location needed */}
        <ISSDetailPanel nextPass={nextPass} />

        {/* Everything below is location-dependent — hidden until a location is picked */}
        {selectedLocation && (
          <>
            {/* Highlighted Planet from Search */}
            {highlightedPlanet && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5">
                <div className="flex items-center gap-2.5">
                  <Globe2 className="h-5 w-5 text-[#A8A9AD]" />
                  <h3 className="text-sm font-bold text-[#FAFAF8]">{highlightedPlanet.name}</h3>
                  <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${highlightedPlanet.isVisible ? "bg-[rgba(0,193,106,0.15)] text-[#00C16A] border border-[rgba(0,193,106,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[#75777D] border border-[rgba(255,255,255,0.06)]"}`}>
                    {highlightedPlanet.isVisible ? "Above horizon" : "Below horizon"}
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs text-[#A8A9AD]">
                  <div className="flex justify-between"><span className="font-medium">Azimuth</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.azimuth.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Elevation</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.elevation.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Distance</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.distance.toFixed(3)} AU</span></div>
                  <div className="flex justify-between"><span className="font-medium">Magnitude</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.magnitude.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Constellation</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.constellation}</span></div>
                  <div className="flex justify-between"><span className="font-medium">RA / Dec</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.ra.toFixed(2)}h / {highlightedPlanet.dec.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Rise / Set</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.riseTime || "—"} / {highlightedPlanet.setTime || "—"}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Transit</span><span className="font-mono text-[#FAFAF8]">{highlightedPlanet.transitTime || "—"}</span></div>
                </div>
              </div>
            )}

            {/* Highlighted Moon from Search */}
            {selectedResult?.type === "moon" && moonData && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5">
                <div className="flex items-center gap-2.5">
                  <Moon className="h-5 w-5 text-[#A8A9AD]" />
                  <h3 className="text-sm font-bold text-[#FAFAF8]">Moon</h3>
                  <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${moonData.isVisible ? "bg-[rgba(0,193,106,0.15)] text-[#00C16A] border border-[rgba(0,193,106,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[#75777D] border border-[rgba(255,255,255,0.06)]"}`}>
                    {moonData.isVisible ? "Visible" : "Below horizon"}
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs text-[#A8A9AD]">
                  <div className="flex justify-between"><span className="font-medium">Phase</span><span className="font-mono text-[#FAFAF8]">{moonData.phase}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Illumination</span><span className="font-mono text-[#FAFAF8]">{moonData.illumination.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="font-medium">Azimuth</span><span className="font-mono text-[#FAFAF8]">{moonData.azimuth.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Elevation</span><span className="font-mono text-[#FAFAF8]">{moonData.elevation.toFixed(2)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Rise / Set</span><span className="font-mono text-[#FAFAF8]">{moonData.moonRise || "—"} / {moonData.moonSet || "—"}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Next Full Moon</span><span className="font-mono text-[#FAFAF8]">{moonData.nextFullMoon}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Next New Moon</span><span className="font-mono text-[#FAFAF8]">{moonData.nextNewMoon}</span></div>
                </div>
              </div>
            )}

            {/* Highlighted Constellation from Search */}
            {highlightedConstellation && (
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-[#A8A9AD]" />
                  <h3 className="text-sm font-bold text-[#FAFAF8]">{highlightedConstellation.name}</h3>
                  <span className="ml-auto rounded-full bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-xs font-medium text-[#75777D] border border-[rgba(255,255,255,0.06)]">
                    {highlightedConstellation.abbreviation}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#A8A9AD]">{highlightedConstellation.description}</p>
                <div className="mt-4 space-y-2.5 text-xs text-[#A8A9AD]">
                  <div className="flex justify-between"><span className="font-medium">Right Ascension</span><span className="font-mono text-[#FAFAF8]">{highlightedConstellation.rightAscension.toFixed(1)}°</span></div>
                  <div className="flex justify-between"><span className="font-medium">Declination</span><span className="font-mono text-[#FAFAF8]">{highlightedConstellation.declination.toFixed(1)}°</span></div>
                </div>
                {highlightedConstellation.stars.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#75777D] mb-2.5">Notable Stars</p>
                    <div className="space-y-2">
                      {highlightedConstellation.stars.map((star) => (
                        <div key={star.name} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#FAFAF8]">{star.name}</span>
                          <span className="font-mono text-[#75777D]">Mag {star.magnitude.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sun */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
                  <Sun className="h-5 w-5 text-[#A8A9AD]" />
                </div>
                <h3 className="text-base font-bold text-[#FAFAF8]">Sun</h3>
                {sunData && (
                  <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${sunData.isVisible ? "bg-[rgba(0,193,106,0.2)] text-[#00C16A] border-2 border-[rgba(0,193,106,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[#75777D] border border-[rgba(255,255,255,0.06)]"}`}>
                    {sunData.isVisible ? "Above horizon" : "Below horizon"}
                  </span>
                )}
              </div>
              {sunData ? (
                <div className="mt-4 space-y-3 text-sm text-[#A8A9AD]">
                  <div className="flex justify-between items-center"><span className="font-semibold">Azimuth</span><span className="font-mono font-bold text-[#FAFAF8]">{sunData.azimuth.toFixed(1)}°</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Elevation</span><span className="font-mono font-bold text-[#FAFAF8]">{sunData.elevation.toFixed(1)}°</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Rise / Set</span><span className="font-mono font-bold text-[#FAFAF8]">{sunData.sunrise || "—"} / {sunData.sunset || "—"}</span></div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#75777D]">Calculating…</p>
              )}
            </div>

            {/* Moon */}
            <div className="rounded-2xl border border-[rgba(168,169,173,0.2)] bg-[#111215] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A8A9AD]">
                  <Moon className="h-5 w-5 text-[#111111]" />
                </div>
                <h3 className="text-base font-bold text-[#FAFAF8]">Moon</h3>
                {moonData && (
                  <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${moonData.isVisible ? "bg-[rgba(0,193,106,0.2)] text-[#00C16A] border-2 border-[rgba(0,193,106,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[#75777D] border border-[rgba(255,255,255,0.06)]"}`}>
                    {moonData.isVisible ? "Visible" : "Below horizon"}
                  </span>
                )}
              </div>
              {moonData ? (
                <div className="mt-4 space-y-3 text-sm text-[#A8A9AD]">
                  <div className="flex justify-between items-center"><span className="font-semibold">Azimuth</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.azimuth.toFixed(1)}°</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Elevation</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.elevation.toFixed(1)}°</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Phase</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.phase}</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Illumination</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.illumination.toFixed(0)}%</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Rise / Set</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.moonRise || "—"} / {moonData.moonSet || "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Next Full</span><span className="font-mono font-bold text-[#FAFAF8]">{moonData.nextFullMoon}</span></div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#75777D]">Calculating…</p>
              )}
            </div>

            {/* Visible Planets */}
            {visiblePlanets.length > 0 && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111215] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)]">
                    <Sun className="h-5 w-5 text-[#A8A9AD]" />
                  </div>
                  <h3 className="text-base font-bold text-[#FAFAF8]">Visible Planets ({visiblePlanets.length})</h3>
                </div>
                <div className="space-y-4">
                  {visiblePlanets.map((planet) => (
                    <div key={planet.name} className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.03)] p-3 border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-bold text-[#FAFAF8]">{planet.name}</p>
                        <p className="text-xs text-[#75777D] mt-0.5">Az: {planet.azimuth.toFixed(1)}° · El: {planet.elevation.toFixed(1)}°</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#A8A9AD]">Mag {planet.magnitude.toFixed(1)}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-[#75777D]" />
                          <span className="text-xs text-[#75777D]">{planet.riseTime || "—"}–{planet.setTime || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visible Constellations */}
            {visibleConstellations.length > 0 && (
              <div className="rounded-2xl border border-[rgba(168,169,173,0.2)] bg-[#111215] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A8A9AD]">
                    <Stars className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#FAFAF8]">Constellations ({visibleConstellations.length})</h3>
                </div>
                <div className="space-y-3">
                  {visibleConstellations.slice(0, 12).map((c) => (
                    <div key={c.name} className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.03)] p-3 border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-bold text-[#FAFAF8]">{c.name}</p>
                        <p className="text-xs text-[#75777D]">{c.abbreviation}</p>
                      </div>
                      <span className="rounded-full bg-[rgba(0,193,106,0.2)] px-3 py-1.5 text-xs font-bold text-[#00C16A] border-2 border-[rgba(0,193,106,0.3)]">Visible</span>
                    </div>
                  ))}
                  {visibleConstellations.length > 12 && (
                    <p className="text-center text-xs font-medium text-[#75777D] pt-2">+{visibleConstellations.length - 12} more above horizon</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
