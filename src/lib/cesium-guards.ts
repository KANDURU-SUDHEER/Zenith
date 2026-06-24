/**
 * Cesium Viewer Readiness Guards
 *
 * Single source of truth for validating the Cesium Viewer is ready
 * for ANY API call. Every Cesium interaction across the project must
 * use these guards — never duplicate checks inline.
 */

import { getGlobalViewer } from "@/hooks/use-cesium-viewer";

// ─── Core Readiness Check ─────────────────────────────────────────────────────

/**
 * Comprehensive Cesium Viewer readiness check.
 * Validates the ENTIRE rendering pipeline is intact before any API call.
 */
export function isViewerReady(): boolean {
  const viewer = getGlobalViewer();

  if (!viewer) return false;
  if (viewer.isDestroyed()) return false;

  const scene = viewer.scene;
  if (!scene) return false;

  const canvas = scene.canvas;
  if (!canvas) return false;

  // @ts-expect-error — Cesium internal: scene.context._gl is the raw WebGL context
  const context = scene.context;
  if (!context) return false;
  if (!context._gl) return false;

  if (scene.drawingBufferWidth <= 0) return false;
  if (scene.drawingBufferHeight <= 0) return false;

  if (canvas.clientWidth <= 0) return false;
  if (canvas.clientHeight <= 0) return false;

  // @ts-expect-error — Cesium internal: scene.frameState
  const frameState = scene.frameState;
  if (!frameState) return false;
  if (!frameState.passes) return false;

  return true;
}

/**
 * Lightweight check for non-rendering operations (adding data sources, entities).
 * Does NOT require valid canvas dimensions — only that the viewer is alive.
 */
export function isViewerAlive(): boolean {
  const viewer = getGlobalViewer();
  if (!viewer) return false;
  if (viewer.isDestroyed()) return false;
  if (!viewer.scene) return false;
  return true;
}

/**
 * Strictest check — for pick operations which are most sensitive
 * to zero-dimension buffers.
 */
export function isViewerReadyForPick(): boolean {
  if (!isViewerReady()) return false;

  const viewer = getGlobalViewer()!;
  const canvas = viewer.scene.canvas as HTMLCanvasElement;

  if (canvas.width <= 0 || canvas.height <= 0) return false;

  return true;
}

/**
 * Check if viewer can handle resize (container must have non-zero size).
 */
export function canResize(): boolean {
  const viewer = getGlobalViewer();
  if (!viewer || viewer.isDestroyed()) return false;

  const container = viewer.container as HTMLElement;
  if (!container) return false;
  if (container.clientWidth <= 0 || container.clientHeight <= 0) return false;

  return true;
}
