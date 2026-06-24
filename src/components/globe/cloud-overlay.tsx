"use client";

import { useEffect, useRef } from "react";
import { useGlobeStore } from "@/stores/globe-store";
import { getGlobalViewer, getGlobalCesium } from "@/hooks/use-cesium-viewer";
import { isViewerAlive } from "@/lib/cesium-guards";

/**
 * Creates a procedural cloud imagery layer using canvas-generated texture.
 */
function createProceduralCloudLayer(
  viewer: InstanceType<typeof import("cesium").Viewer>,
  CesiumLib: typeof import("cesium")
): InstanceType<typeof import("cesium").ImageryLayer> {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 2048, 1024);

  for (let c = 0; c < 45; c++) {
    const cx = Math.random() * 2048;
    const cy = 100 + Math.random() * 824;
    const size = 40 + Math.random() * 100;
    const puffs = 5 + Math.floor(Math.random() * 10);

    for (let p = 0; p < puffs; p++) {
      const px = cx + (Math.random() - 0.5) * size;
      const py = cy + (Math.random() - 0.5) * size * 0.4;
      const r = 8 + Math.random() * 25;
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, r);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.5)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }

  const textureUrl = canvas.toDataURL("image/png");
  const provider = new CesiumLib.SingleTileImageryProvider({
    url: textureUrl,
    rectangle: CesiumLib.Rectangle.fromDegrees(-180, -90, 180, 90),
    tileWidth: 2048,
    tileHeight: 1024,
  });

  const layer = viewer.imageryLayers.addImageryProvider(provider);
  layer.alpha = 0.55;
  layer.brightness = 1.5;
  layer.show = true;
  return layer;
}

export function CloudOverlay() {
  const cloudsEnabled = useGlobeStore((s) => s.cloudsEnabled);
  const isReady = useGlobeStore((s) => s.isReady);
  const layerRef = useRef<InstanceType<typeof import("cesium").ImageryLayer> | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const viewer = getGlobalViewer();
    const CesiumLib = getGlobalCesium();
    if (!viewer || !CesiumLib || viewer.isDestroyed()) return;
    if (!isViewerAlive()) return;

    if (cloudsEnabled && !layerRef.current) {
      // Use an async IIFE to handle the OWM fetch test
      (async () => {
        try {
          const owmKey = process.env.NEXT_PUBLIC_OWM_API_KEY;
          let cloudLayer: InstanceType<typeof import("cesium").ImageryLayer>;

          if (owmKey && owmKey.length > 5) {
            // Test if OWM key is active
            const testUrl = `https://tile.openweathermap.org/map/clouds_new/0/0/0.png?appid=${owmKey}`;
            let owmActive = false;

            try {
              const resp = await fetch(testUrl, { method: "HEAD" });
              owmActive = resp.ok;
            } catch {
              // OWM unreachable — fall through to procedural
            }

            if (owmActive && !viewer.isDestroyed()) {
              const provider = new CesiumLib.UrlTemplateImageryProvider({
                url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${owmKey}`,
                maximumLevel: 6,
                credit: "© OpenWeatherMap",
              });
              cloudLayer = viewer.imageryLayers.addImageryProvider(provider);
              cloudLayer.alpha = 0.7;
              cloudLayer.brightness = 1.3;
              cloudLayer.show = true;
            } else if (!viewer.isDestroyed()) {
              cloudLayer = createProceduralCloudLayer(viewer, CesiumLib);
            } else {
              return;
            }
          } else {
            cloudLayer = createProceduralCloudLayer(viewer, CesiumLib);
          }

          layerRef.current = cloudLayer;
          viewer.scene.requestRender();
        } catch {
          // Last resort — procedural
          if (!viewer.isDestroyed()) {
            layerRef.current = createProceduralCloudLayer(viewer, CesiumLib);
            viewer.scene.requestRender();
          }
        }
      })();
    } else if (!cloudsEnabled && layerRef.current) {
      if (!viewer.isDestroyed()) {
        viewer.imageryLayers.remove(layerRef.current, true);
        viewer.scene.requestRender();
      }
      layerRef.current = null;
    }
  }, [cloudsEnabled, isReady]);

  useEffect(() => {
    return () => {
      if (layerRef.current) {
        const viewer = getGlobalViewer();
        if (viewer && !viewer.isDestroyed()) {
          viewer.imageryLayers.remove(layerRef.current, true);
        }
        layerRef.current = null;
      }
    };
  }, []);

  return null;
}
