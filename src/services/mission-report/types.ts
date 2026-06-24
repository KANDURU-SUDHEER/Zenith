/**
 * Mission Intelligence Report — Type Definitions
 * Production-quality types for aerospace-grade report generation.
 */

export interface MissionReportConfig {
  missionName: string;
  missionId: string;
  observer: ObserverInfo;
  searchRadius: number;
  altitudeFilter: number;
  categories: SatelliteCategoryFilter;
  reportOptions: ReportOptions;
  exportFormat: ExportFormat;
}

export interface ObserverInfo {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currentUTC: string;
  currentLocal: string;
}

export interface SatelliteCategoryFilter {
  iss: boolean;
  starlink: boolean;
  gps: boolean;
  weather: boolean;
  earthObservation: boolean;
  scientific: boolean;
  communication: boolean;
  military: boolean;
  spaceStations: boolean;
  naturalSatellites: boolean;
  all: boolean;
}

export interface ReportOptions {
  includeRadarScreenshot: boolean;
  includeObserverInfo: boolean;
  includeSatelliteStatistics: boolean;
  includeOrbitInfo: boolean;
  includeNextPassPredictions: boolean;
  includeLiveTimestamp: boolean;
  includeCountryFlags: boolean;
  includeSummaryCharts: boolean;
  includeMissionNotes: boolean;
}

export type ExportFormat = "pdf" | "json" | "csv";

export interface SatelliteReportEntry {
  noradId: number;
  name: string;
  country: string;
  operator: string;
  launchYear: number | undefined;
  category: string;
  orbitType: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speedKms: number;
  speedKmh: number;
  inclination: number | undefined;
  orbitPeriod: number | undefined;
  visibility: "Visible" | "Below Horizon";
  distanceFromObserver: number;
  status: "active" | "inactive" | "unknown";
}

export interface ReportStatistics {
  totalScanned: number;
  visibleSatellites: number;
  filteredObjects: number;
  countriesRepresented: number;
  categoriesCount: number;
  orbitTypesCount: number;
  mostCommonOrbit: string;
  highestSatellite: { name: string; altitude: number };
  lowestSatellite: { name: string; altitude: number };
  averageSpeed: number;
  averageAltitude: number;
  fastestObject: { name: string; speed: number };
  nearestObject: { name: string; distance: number };
  farthestObject: { name: string; distance: number };
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  color: string;
  percentage: number;
}

export interface CountryBreakdown {
  country: string;
  count: number;
  percentage: number;
}

export interface OrbitTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface AltitudeDistribution {
  range: string;
  count: number;
}

export interface ISSReportData {
  speed: number;
  altitude: number;
  latitude: number;
  longitude: number;
  nextPass?: string;
  maxElevation?: number;
  duration?: number;
  visibility?: string;
}

export interface SunReportData {
  azimuth: number;
  elevation: number;
  isVisible: boolean;
  sunrise: string | null;
  sunset: string | null;
  solarNoon: string | null;
  goldenHourStart: string | null;
  goldenHourEnd: string | null;
  blueHourStart: string | null;
  blueHourEnd: string | null;
  civilDawn: string | null;
  civilDusk: string | null;
  nauticalDawn: string | null;
  nauticalDusk: string | null;
  astronomicalDawn: string | null;
  astronomicalDusk: string | null;
}

export interface MoonReportData {
  phase: string;
  illumination: number;
  moonAge: number;
  distance: number;
  azimuth: number;
  elevation: number;
  isVisible: boolean;
  moonRise: string | null;
  moonSet: string | null;
  constellation: string;
}

export interface PlanetReportData {
  name: string;
  magnitude: number;
  azimuth: number;
  elevation: number;
  distance: number;
  isVisible: boolean;
  constellation: string;
  riseTime: string | null;
  setTime: string | null;
}

export interface MissionAnalysis {
  summary: string[];
}

export interface MissionAuthentication {
  missionId: string;
  reportVersion: string;
  zenithVersion: string;
  generationTimestamp: string;
  sha256Hash: string;
  dataSources: string[];
}

export interface MissionReportData {
  config: MissionReportConfig;
  generatedAt: string;
  statistics: ReportStatistics;
  satellites: SatelliteReportEntry[];
  categoryBreakdown: CategoryBreakdown[];
  countryBreakdown: CountryBreakdown[];
  orbitTypeBreakdown: OrbitTypeBreakdown[];
  altitudeDistribution: AltitudeDistribution[];
  issData: ISSReportData | null;
  sunData: SunReportData | null;
  moonData: MoonReportData | null;
  planets: PlanetReportData[];
  missionAnalysis: MissionAnalysis;
  authentication: MissionAuthentication;
  radarScreenshot: string | null;
}
