/**
 * Radar Capture Service
 * 
 * Captures the Zenith Radar canvas as a high-quality PNG image
 * for inclusion in the Mission Intelligence Report.
 */

import html2canvas from "html2canvas";

/**
 * Captures the radar canvas element as a base64-encoded PNG.
 * Falls back to direct canvas export if html2canvas fails.
 */
export async function captureRadarScreenshot(): Promise<string | null> {
  try {
    // Try to capture the canvas directly first (faster, higher quality)
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[aria-label="Sky radar"] canvas'
    );

    if (canvas) {
      // Direct canvas export — best quality
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      if (dataUrl && dataUrl !== "data:,") {
        return dataUrl;
      }
    }

    // Fallback: use html2canvas to capture the entire radar container
    const radarContainer = document.querySelector<HTMLElement>(
      '[aria-label="Sky radar"]'
    );

    if (!radarContainer) {
      console.warn("[RadarCapture] Radar container not found");
      return null;
    }

    const capturedCanvas = await html2canvas(radarContainer, {
      backgroundColor: "#030014",
      scale: 2, // 2x resolution for crisp output
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    return capturedCanvas.toDataURL("image/png", 0.92);
  } catch (error) {
    console.error("[RadarCapture] Failed to capture radar:", error);
    return null;
  }
}
