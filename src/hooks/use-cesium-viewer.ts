"use client";

import { useRef, useCallback } from "react";
import { isViewerReady } from "@/lib/cesium-guards";

/**
 * Module-level globals for the active Cesium Viewer and library reference.
 *
 * These live outside React so any component can access the viewer without
 * prop-drilling.  The previous viewer is explicitly destroyed before a new
 * one is stored, preventing the double-mount leak that occurred with
 * React Strict Mode (which is now re-enabled in next.config.ts).
 */
let globalViewer: InstanceType<typeof import("cesium").Viewer> | null = null;
let globalCesium: typeof import("cesium") | null = null;

export function setGlobalViewer(
  viewer: InstanceType<typeof import("cesium").Viewer> | null
): void {
  // If a previous viewer exists and is not already the same instance,
  // destroy it before replacing — prevents the memory leak from double-mounts.
  if (globalViewer && globalViewer !== viewer && !globalViewer.isDestroyed()) {
    globalViewer.destroy();
  }
  globalViewer = viewer;
}

export function getGlobalViewer(): InstanceType<typeof import("cesium").Viewer> | null {
  return globalViewer;
}

export function setGlobalCesium(cesium: typeof import("cesium")): void {
  globalCesium = cesium;
}

export function getGlobalCesium(): typeof import("cesium") | null {
  return globalCesium;
}

export function useCesiumViewer() {
  const viewerRef = useRef(globalViewer);

  const getViewer = useCallback(() => globalViewer, []);

  const getCesium = useCallback(() => globalCesium, []);

  const flyTo = useCallback(
    (longitude: number, latitude: number, height = 5_000_000, duration = 2.5) => {
      const viewer = globalViewer;
      const Cesium = globalCesium;
      if (!viewer || !Cesium || viewer.isDestroyed()) return;
      if (!isViewerReady()) return;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
        duration,
        easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      });
    },
    []
  );

  const flyHome = useCallback(() => {
    const viewer = globalViewer;
    const Cesium = globalCesium;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerReady()) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 2,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const orientNorth = useCallback(() => {
    const viewer = globalViewer;
    const Cesium = globalCesium;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;
    if (!isViewerReady()) return;

    const camera = viewer.camera;
    viewer.camera.flyTo({
      destination: camera.position.clone(),
      orientation: {
        heading: 0,
        pitch: camera.pitch,
        roll: 0,
      },
      duration: 1.5,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  return {
    viewerRef,
    getViewer,
    getCesium,
    flyTo,
    flyHome,
    orientNorth,
  };
}
