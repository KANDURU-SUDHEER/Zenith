"use client";

import { useEffect, useRef, useMemo } from "react";
import { getGlobalViewer, getGlobalCesium } from "@/hooks/use-cesium-viewer";
import { useSatelliteStore } from "@/stores/satellite-store";
import { getCategoryMeta, getAllCachedTLE } from "@/services/tle-service";
import {
  computeFullOrbit,
  computeOrbitTrail,
} from "@/services/orbital-propagation";
import { getFallbackTLEData } from "@/services/tle-fallback";
import { isViewerReady, isViewerAlive } from "@/lib/cesium-guards";
import type { OrbitPoint, TLEData } from "@/types";

/**
 * Renders the full orbit path + trail for the currently selected satellite.
 * Shows:
 *  - Future orbit (solid glowing line in category color)
 *  - Past trail (dashed fading line)
 * Clears when selection is removed.
 */
export function SelectedOrbitRenderer() {
  const selectedSatellite = useSatelliteStore((s) => s.selectedSatellite);
  const orbitEntityRef = useRef<unknown>(null);
  const trailEntityRef = useRef<unknown>(null);
  const dataSourceRef = useRef<unknown>(null);
  const prevSatIdRef = useRef<number | null>(null);

  // Fly camera to the selected satellite when selection changes
  useEffect(() => {
    if (!selectedSatellite) {
      prevSatIdRef.current = null;
      return;
    }
    // Only fly if this is a NEW selection (not the same satellite updating position)
    if (prevSatIdRef.current === selectedSatellite.noradId) return;
    prevSatIdRef.current = selectedSatellite.noradId;

    // Use a short delay to ensure this runs AFTER any competing location flyTo
    const timeout = setTimeout(() => {
      const viewer = getGlobalViewer();
      const Cesium = getGlobalCesium();
      if (!viewer || !Cesium || viewer.isDestroyed()) return;
      if (!isViewerReady()) return;

      // Get the latest position from the store (satellite may have moved)
      const currentSat = useSatelliteStore.getState().selectedSatellite;
      if (!currentSat) return;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          currentSat.longitude,
          currentSat.latitude,
          currentSat.altitude * 1000 + 2_000_000
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60),
          roll: 0,
        },
        duration: 2,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedSatellite]);

  // Initialize data source
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    const dataSource = new Cesium.CustomDataSource("selected-orbit");
    viewer.dataSources.add(dataSource);
    dataSourceRef.current = dataSource;

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.dataSources.remove(
          dataSource as InstanceType<typeof import("cesium").CustomDataSource>,
          true
        );
      }
    };
  }, []);

  // Find TLE for the selected satellite
  const tle = useMemo((): TLEData | null => {
    if (!selectedSatellite) return null;
    const noradId = selectedSatellite.noradId;
    // First check live cached TLE data
    const liveTle = getAllCachedTLE();
    const found = liveTle.find((t) => t.noradId === noradId);
    if (found) return found;
    // Fallback to embedded TLE data
    const fallback = getFallbackTLEData();
    return fallback.find((t) => t.noradId === noradId) || null;
  }, [selectedSatellite]);

  // Compute orbit and trail
  const orbitPath = useMemo((): OrbitPoint[] => {
    if (!tle) return [];
    return computeFullOrbit(tle, new Date());
  }, [tle]);

  const trailPath = useMemo((): OrbitPoint[] => {
    if (!tle) return [];
    return computeOrbitTrail(tle, new Date(), 30);
  }, [tle]);

  // Render orbit
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = dataSourceRef.current as InstanceType<typeof import("cesium").CustomDataSource> | null;
    if (!dataSource) return;

    // Clear previous orbit
    if (orbitEntityRef.current) {
      dataSource.entities.remove(orbitEntityRef.current as InstanceType<typeof import("cesium").Entity>);
      orbitEntityRef.current = null;
    }

    if (orbitPath.length < 2 || !selectedSatellite) {
      viewer.scene.requestRender();
      return;
    }

    const meta = getCategoryMeta(selectedSatellite.category);
    const color = Cesium.Color.fromCssColorString(meta.color);

    const positions = orbitPath.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude * 1000)
    );

    const entity = dataSource.entities.add({
      polyline: {
        positions,
        width: 2.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: color.withAlpha(0.8),
        }),
        clampToGround: false,
      },
    });

    orbitEntityRef.current = entity;
    viewer.scene.requestRender();
  }, [orbitPath, selectedSatellite]);

  // Render trail
  useEffect(() => {
    const viewer = getGlobalViewer();
    const Cesium = getGlobalCesium();
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    const dataSource = dataSourceRef.current as InstanceType<typeof import("cesium").CustomDataSource> | null;
    if (!dataSource) return;

    // Clear previous trail
    if (trailEntityRef.current) {
      dataSource.entities.remove(trailEntityRef.current as InstanceType<typeof import("cesium").Entity>);
      trailEntityRef.current = null;
    }

    if (trailPath.length < 2 || !selectedSatellite) {
      viewer.scene.requestRender();
      return;
    }

    const positions = trailPath.map((p) =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude * 1000)
    );

    const entity = dataSource.entities.add({
      polyline: {
        positions,
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString("#94a3b8").withAlpha(0.4),
          dashLength: 12,
          dashPattern: 255,
        }),
        clampToGround: false,
      },
    });

    trailEntityRef.current = entity;
    viewer.scene.requestRender();
  }, [trailPath, selectedSatellite]);

  return null;
}
