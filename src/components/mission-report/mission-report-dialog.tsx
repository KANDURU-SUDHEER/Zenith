"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  X,
  FileText,
  Download,
  MapPin,
  Satellite,
  Filter,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useLocationStore } from "@/stores/location-store";
import { useOrbitalData } from "@/providers/orbital-engine-provider";
import { useISSTracker } from "@/hooks/use-iss-tracker";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import {
  generateMissionReport,
  exportToPDF,
  exportToCSV,
} from "@/services/mission-report";
import type {
  MissionReportConfig,
  SatelliteCategoryFilter,
  ReportOptions,
  ExportFormat,
} from "@/services/mission-report";

interface MissionReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const RADIUS_OPTIONS = [100, 500, 1000, 2500, 5000, 10000, 0];

/** All report sections enabled — stable module-level constant, never re-created. */
const ALL_REPORT_OPTIONS: ReportOptions = {
  includeRadarScreenshot: true, includeObserverInfo: true,
  includeSatelliteStatistics: true, includeOrbitInfo: true,
  includeNextPassPredictions: true, includeLiveTimestamp: true,
  includeCountryFlags: true, includeSummaryCharts: true, includeMissionNotes: true,
};
const ALTITUDE_OPTIONS = [
  { label: "500 km", value: 500 },
  { label: "1000 km", value: 1000 },
  { label: "2000 km", value: 2000 },
  { label: "5000 km", value: 5000 },
  { label: "No Limit", value: 0 },
];

function generateMissionId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZNT-${ts}-${rand}`;
}

export function MissionReportDialog({ isOpen, onClose }: MissionReportDialogProps) {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { satellites } = useOrbitalData();
  const { issData } = useISSTracker();
  const { sun, moon, planets } = useCelestialEngine();

  // Keep refs for celestial data to always have the latest at generation time
  const issRef = useRef(issData);
  const sunRef = useRef(sun);
  const moonRef = useRef(moon);
  const planetsRef = useRef(planets);

  useEffect(() => { issRef.current = issData; }, [issData]);
  useEffect(() => { sunRef.current = sun; }, [sun]);
  useEffect(() => { moonRef.current = moon; }, [moon]);
  useEffect(() => { planetsRef.current = planets; }, [planets]);

  // Form state
  const [missionName, setMissionName] = useState("Zenith Mission Report");
  const [searchRadius, setSearchRadius] = useState(0);
  const [altitudeFilter, setAltitudeFilter] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progressStep, setProgressStep] = useState("");

  const [categories, setCategories] = useState<SatelliteCategoryFilter>({
    iss: true, starlink: true, gps: true, weather: true,
    earthObservation: true, scientific: true, communication: true,
    military: true, spaceStations: true, naturalSatellites: true, all: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const toggleCategory = (key: keyof SatelliteCategoryFilter) => {
    if (key === "all") {
      const v = !categories.all;
      setCategories({
        iss: v, starlink: v, gps: v, weather: v, earthObservation: v,
        scientific: v, communication: v, military: v, spaceStations: v,
        naturalSatellites: v, all: v,
      });
    } else {
      setCategories((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        // If any individual category is unchecked, "all" must be false
        const allChecked = updated.iss && updated.starlink && updated.gps &&
          updated.weather && updated.earthObservation && updated.scientific &&
          updated.communication && updated.military && updated.spaceStations &&
          updated.naturalSatellites;
        updated.all = allChecked;
        return updated;
      });
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedLocation) return;
    setIsGenerating(true);
    setIsComplete(false);

    try {
      const now = new Date();

      const config: MissionReportConfig = {
        missionName,
        missionId: generateMissionId(),
        observer: {
          name: selectedLocation.displayName || selectedLocation.name,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          timezone: selectedLocation.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          currentUTC: now.toUTCString(),
          currentLocal: now.toLocaleString(),
        },
        searchRadius,
        altitudeFilter,
        categories,
        reportOptions: ALL_REPORT_OPTIONS,
        exportFormat,
      };

      const reportData = await generateMissionReport(
        {
          config,
          satellites,
          issData: issRef.current,
          sunData: sunRef.current,
          moonData: moonRef.current,
          planets: planetsRef.current,
        },
        (step) => setProgressStep(step)
      );

      setProgressStep("Exporting " + exportFormat.toUpperCase());

      switch (exportFormat) {
        case "pdf":
          await exportToPDF(reportData);
          break;
        case "csv":
          exportToCSV(reportData);
          break;
      }

      setIsComplete(true);
      setProgressStep("Completed");
      setTimeout(() => { setIsComplete(false); setProgressStep(""); }, 3000);
    } catch (error) {
      console.error("[MissionReport] Generation failed:", error);
      setProgressStep("Error: Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLocation, missionName, searchRadius, altitudeFilter, categories, exportFormat, satellites]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

        <div
        className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#0D0E10] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        role="dialog" aria-modal="true" aria-labelledby="mission-report-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#111215] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C1E22] border border-[rgba(255,255,255,0.08)] sm:h-10 sm:w-10">
              <FileText className="h-4 w-4 text-[#A8A9AD] sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="mission-report-title" className="text-sm font-bold text-[#FAFAF8] sm:text-base md:text-lg">Mission Intelligence Report</h2>
              <p className="truncate text-xs text-[#75777D]">Generate professional mission analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="ml-2 shrink-0 rounded-lg p-2 text-[#75777D] transition hover:bg-[rgba(255,255,255,0.03)] hover:text-[#FAFAF8]" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:px-6 sm:py-5 sm:space-y-6">
          <Section icon={<FileText className="h-4 w-4" />} title="Mission Name">
            <input type="text" value={missionName} onChange={(e) => setMissionName(e.target.value)}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[#FAFAF8] placeholder-[#75777D] outline-none transition focus:border-[rgba(244,165,36,0.4)] focus:ring-2 focus:ring-[rgba(244,165,36,0.2)]"
              placeholder="Enter mission name..." />
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Observer Location">
            {selectedLocation ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoField label="Location" value={selectedLocation.displayName || selectedLocation.name} span={2} />
                <InfoField label="Latitude" value={`${selectedLocation.latitude.toFixed(4)}°`} />
                <InfoField label="Longitude" value={`${selectedLocation.longitude.toFixed(4)}°`} />
                <InfoField label="Timezone" value={selectedLocation.timezone || "Auto"} />
                <InfoField label="Current UTC" value={new Date().toUTCString().slice(0, -4)} />
              </div>
            ) : (
              <p className="text-sm text-[#75777D]">⚠ Select a location on the globe first.</p>
            )}
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Search Radius">
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button key={r} onClick={() => setSearchRadius(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition min-h-[36px] ${searchRadius === r ? "bg-[rgba(255,255,255,0.10)] text-[#FAFAF8] border-2 border-[rgba(255,255,255,0.2)]" : "bg-[rgba(255,255,255,0.03)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] border border-[rgba(255,255,255,0.06)]"}`}>
                  {r === 0 ? "No Limit" : `${r} km`}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={<Filter className="h-4 w-4" />} title="Altitude Filter">
            <div className="flex flex-wrap gap-2">
              {ALTITUDE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setAltitudeFilter(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition min-h-[36px] ${altitudeFilter === opt.value ? "bg-[rgba(255,255,255,0.10)] text-[#FAFAF8] border-2 border-[rgba(255,255,255,0.2)]" : "bg-[rgba(255,255,255,0.03)] text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8] border border-[rgba(255,255,255,0.06)]"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={<Satellite className="h-4 w-4" />} title="Satellite Categories">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(categories) as Array<keyof SatelliteCategoryFilter>).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition hover:bg-[rgba(255,255,255,0.03)] min-h-[36px]">
                  <input type="checkbox" checked={categories[key]} onChange={() => toggleCategory(key)} className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.15)] accent-white" />
                  <span className="text-[#A8A9AD] capitalize">{formatCategoryLabel(key)}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section icon={<Download className="h-4 w-4" />} title="Export Format">
            <div className="flex gap-3">
              {(["pdf", "csv"] as ExportFormat[]).map((fmt) => (
                <button key={fmt} onClick={() => setExportFormat(fmt)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wider transition min-h-[40px] sm:px-5 ${exportFormat === fmt ? "bg-[#F5F5F4] text-[#111111]" : "bg-[rgba(255,255,255,0.03)] text-[#A8A9AD] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FAFAF8]"}`}>
                  {fmt}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(255,255,255,0.06)] bg-[#111215] px-4 py-3 sm:px-6 sm:py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[#75777D] transition hover:bg-[rgba(255,255,255,0.03)] hover:text-[#FAFAF8] min-h-[40px]">Cancel</button>
          <button onClick={handleGenerate} disabled={!selectedLocation || isGenerating || satellites.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F5F5F4] px-5 py-2.5 text-sm font-semibold text-[#111111] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px]">
            {isGenerating ? (<><Loader2 className="h-4 w-4 animate-spin" />{progressStep || "Generating..."}</>)
              : isComplete ? (<><CheckCircle2 className="h-4 w-4" />Downloaded!</>)
              : (<><Download className="h-4 w-4" />Generate Report</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#A8A9AD]">{icon}</span>
        <h3 className="text-sm font-semibold text-[#FAFAF8]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoField({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-[#75777D]">{label}</p>
      <p className="mt-0.5 font-mono text-xs text-[#A8A9AD]">{value}</p>
    </div>
  );
}

function formatCategoryLabel(key: string): string {
  const labels: Record<string, string> = {
    iss: "ISS", starlink: "Starlink", gps: "GPS", weather: "Weather",
    earthObservation: "Earth Observation", scientific: "Scientific",
    communication: "Communication", military: "Military",
    spaceStations: "Space Stations", naturalSatellites: "Natural Satellites", all: "Select All",
  };
  return labels[key] || key;
}
