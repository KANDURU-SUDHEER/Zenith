export const SITE_CONFIG = {
  name: "Project Zenith",
  description:
    "Real-time celestial observation platform. Discover what's above you, anywhere on Earth.",
  url: "https://project-zenith.vercel.app",
  ogImage: "/og.png",
  creator: "Project Zenith Team",
} as const;

export const API_ENDPOINTS = {
  /** Primary ISS position (HTTPS, no key) */
  issPosition: "https://api.wheretheiss.at/v1/satellites/25544",
  /** Fallback ISS position (HTTP, no key) */
  issPositionFallback: "http://api.open-notify.org/iss-now.json",
  /** Satellite orbital elements (no key) */
  celestrak: "https://celestrak.org/NORAD/elements/gp.php",
  /** Geocoding (no key, requires User-Agent) */
  nominatim: "https://nominatim.openstreetmap.org",
  /** NASA APOD — proxied through /api/nasa/apod (key server-side) */
  nasaApod: "/api/nasa/apod",
  /** NASA JPL Horizons ephemeris (no key) */
  nasaHorizons: "https://ssd.jpl.nasa.gov/api/horizons.api",
  /** AI Sky Guide — proxied through /api/ai/sky-guide (key server-side) */
  aiSkyGuide: "/api/ai/sky-guide",
} as const;

export const CACHE_TIMES = {
  issPosition: 5_000,       // ISS position refresh: every 5 seconds
  satellites: 10_000,       // Satellite propagation: every 10 seconds
  planets: 60_000,          // Celestial engine: every 60 seconds
  constellations: 3_600_000, // Constellation data: every hour
  apod: 86_400_000,         // APOD: every 24 hours
  apiHealth: 30_000,        // API health checks: every 30 seconds
  observerVisibility: 60_000, // Observer visibility: every 60 seconds
} as const;

// NAV_LINKS reflects the actual routes that exist in the application.
// The dashboard uses a single /zenith route with view switching — sub-routes
// like /zenith/globe, /zenith/radar, etc. are not separate pages.
export const NAV_LINKS = [
  { label: "Dashboard", href: "/zenith" },
  { label: "About", href: "#about" },
] as const;

export const LANDING_STATS = [
  { value: 8342, label: "Active Satellites", icon: "satellite" as const },
  { value: 1529, label: "Tracked Objects", icon: "target" as const },
  { value: 42, label: "Active Missions", icon: "rocket" as const },
  { value: 195, label: "Countries Covered", icon: "globe" as const },
] as const;

export const FEATURES = [
  {
    title: "Real-Time ISS Tracking",
    description:
      "Follow the International Space Station as it orbits Earth at 28,000 km/h. Know exactly when it passes overhead.",
    icon: "satellite" as const,
  },
  {
    title: "Celestial Body Identification",
    description:
      "Instantly identify planets, stars, and constellations visible from your exact location at any given time.",
    icon: "telescope" as const,
  },
  {
    title: "Interactive 3D Globe",
    description:
      "Explore Earth in stunning 3D. Click any location to discover its celestial view with orbital overlays.",
    icon: "globe" as const,
  },
  {
    title: "AI Sky Guide",
    description:
      "Ask questions about the night sky. Get intelligent answers about celestial objects, events, and observation tips.",
    icon: "brain" as const,
  },
  {
    title: "Satellite Constellation Map",
    description:
      "Track thousands of active satellites in real-time. Visualize orbital paths and predict visibility windows.",
    icon: "orbit" as const,
  },
  {
    title: "Rise & Set Times",
    description:
      "Precise rise, transit, and set times for every visible celestial body. Plan your observations perfectly.",
    icon: "clock" as const,
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Select Your Location",
    description:
      "Click anywhere on the interactive globe, search for a city, or use your current GPS coordinates.",
  },
  {
    step: 2,
    title: "Scan the Sky",
    description:
      "Our engine calculates orbital positions, planetary alignments, and constellation visibility in real-time.",
  },
  {
    step: 3,
    title: "Explore & Learn",
    description:
      "View detailed information about each celestial object. Ask the AI guide for deeper insights and observation tips.",
  },
] as const;

export const TECH_STACK = [
  { name: "Next.js 16", category: "Framework" },
  { name: "React 19", category: "UI Library" },
  { name: "CesiumJS", category: "3D Globe" },
  { name: "TanStack Query", category: "Data Fetching" },
  { name: "Framer Motion", category: "Animations" },
  { name: "Zustand", category: "State Management" },
  { name: "Tailwind CSS v4", category: "Styling" },
  { name: "Google Gemini", category: "AI Engine" },
] as const;
