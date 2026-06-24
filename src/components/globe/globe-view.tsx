"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { GlobeLoading } from "./globe-loading";
import { LeafletFallback } from "./leaflet-fallback";
import { useGlobeStore } from "@/stores/globe-store";

const CesiumGlobe = dynamic(
  () => import("./cesium-globe").then((m) => m.CesiumGlobe),
  {
    ssr: false,
    loading: () => <GlobeLoading />,
  }
);

const OrbitalEngineLayer = dynamic(
  () => import("./orbital-engine-layer").then((m) => m.OrbitalEngineLayer),
  { ssr: false }
);

// Check WebGL support ONCE and cache the result.
// CRITICAL: Do NOT create a new WebGL context on every call.
// Each getContext("webgl2") allocates a GPU context. Browsers limit active contexts
// (typically 8–16). Exceeding this kills the oldest context — Cesium's — causing
// "drawingBufferWidth must be greater than 0" crashes.
let _webglSupported: boolean | null = null;

function getWebGLSupport(): boolean {
  if (_webglSupported !== null) return _webglSupported;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    _webglSupported = !!gl;
    // Immediately lose the context to free the GPU resource
    if (gl) {
      const loseExt = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
      if (loseExt) loseExt.loseContext();
    }
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}

function subscribeToNothing(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return true;
}

export function GlobeView() {
  const webglSupported = useSyncExternalStore(
    subscribeToNothing,
    getWebGLSupport,
    getServerSnapshot
  );
  const isReady = useGlobeStore((s) => s.isReady);

  if (!webglSupported) {
    return <LeafletFallback />;
  }

  return (
    <>
      <CesiumGlobe />
      <GlobeLoading />
      {isReady && <OrbitalEngineLayer />}
    </>
  );
}