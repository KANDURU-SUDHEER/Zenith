"use client";

import { useOrbitalData } from "@/providers/orbital-engine-provider";
import { useISSTracker } from "@/hooks/use-iss-tracker";
import { ISS_NORAD_ID } from "@/hooks/use-orbital-engine";
import { SatelliteRenderer } from "./satellite-renderer";
import { ISSRenderer } from "./iss-renderer";
import { SelectedOrbitRenderer } from "./selected-orbit-renderer";

/**
 * Orbital Engine Layer
 * Renders all orbital visualization on the Cesium globe:
 * - ISS with orbit path + trail (dedicated high-fidelity renderer)
 * - All filtered satellites as points (general renderer)
 * - Selected satellite orbit path + trail
 */
export function OrbitalEngineLayer() {
  const { filteredSatellites } = useOrbitalData();
  const { issData, orbitPath, trail } = useISSTracker();

  // Exclude ISS from the general satellite renderer — it has its own dedicated
  // layer with a trail, orbit path, and animated position.
  const nonIssSatellites = filteredSatellites.filter(
    (s) => s.noradId !== ISS_NORAD_ID && s.category !== "iss"
  );

  return (
    <>
      <ISSRenderer issData={issData} orbitPath={orbitPath} trail={trail} />
      <SatelliteRenderer satellites={nonIssSatellites} />
      <SelectedOrbitRenderer />
    </>
  );
}
