/**
 * JSON & CSV Export for Mission Intelligence Report
 */

import type { MissionReportData } from "./types";

/**
 * Export report data as a formatted JSON file.
 */
export function exportToJSON(data: MissionReportData): void {
  // Strip the base64 screenshot to keep file size reasonable
  const exportData = {
    ...data,
    radarScreenshot: data.radarScreenshot ? "[base64 image omitted]" : null,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${data.config.missionName.replace(/\s+/g, "_")}_${dateStamp()}.json`);
}

/**
 * Export satellite table as CSV file.
 */
export function exportToCSV(data: MissionReportData): void {
  const headers = [
    "NORAD ID", "Name", "Country", "Operator", "Launch Year",
    "Category", "Orbit Type", "Latitude", "Longitude", "Altitude (km)",
    "Speed (km/s)", "Speed (km/h)", "Inclination (°)", "Orbit Period (min)",
    "Visibility", "Distance from Observer (km)", "Status",
  ];

  const rows = data.satellites.map((sat) => [
    sat.noradId,
    `"${sat.name}"`,
    `"${sat.country}"`,
    `"${sat.operator}"`,
    sat.launchYear || "",
    sat.category,
    sat.orbitType,
    sat.latitude.toFixed(4),
    sat.longitude.toFixed(4),
    sat.altitude.toFixed(1),
    sat.speedKms.toFixed(3),
    sat.speedKmh.toFixed(0),
    sat.inclination?.toFixed(2) || "",
    sat.orbitPeriod?.toFixed(1) || "",
    sat.visibility,
    sat.distanceFromObserver.toFixed(0),
    sat.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${data.config.missionName.replace(/\s+/g, "_")}_${dateStamp()}.csv`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
