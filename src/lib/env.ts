import { z } from "zod";

/**
 * Server-side environment variables.
 * Only available in API routes and server components.
 * Never exposed to the client bundle.
 */
const serverEnvSchema = z.object({
  NASA_API_KEY: z.string().min(1, "NASA_API_KEY is required"),
  GEMINI_API_KEY: z.string().optional().default(""),
});

/**
 * Client-side environment variables.
 * Prefixed with NEXT_PUBLIC_ — bundled into the client.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_CESIUM_ION_TOKEN: z.string().optional().default(""),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Server env validation failed:", parsed.error.flatten().fieldErrors);
    return { NASA_API_KEY: "DEMO_KEY", GEMINI_API_KEY: "" };
  }

  return parsed.data;
}

export function getClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_CESIUM_ION_TOKEN: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "",
  });

  if (!parsed.success) {
    return { NEXT_PUBLIC_CESIUM_ION_TOKEN: "" };
  }

  return parsed.data;
}

/**
 * API availability status report.
 * Used by /api/status endpoint.
 */
export function getApiStatus() {
  const server = getServerEnv();
  const client = getClientEnv();

  return {
    nasa: {
      configured: server.NASA_API_KEY.length > 0 && server.NASA_API_KEY !== "DEMO_KEY",
      usingDemoKey: server.NASA_API_KEY === "DEMO_KEY",
    },
    gemini: {
      configured: (server.GEMINI_API_KEY ?? "").length > 0,
    },
    cesiumIon: {
      configured: client.NEXT_PUBLIC_CESIUM_ION_TOKEN.length > 0,
    },
    publicApis: {
      whereTheISS: "https://api.wheretheiss.at (no key)",
      openNotify: "http://api.open-notify.org (no key)",
      celestrak: "https://celestrak.org (no key)",
      jplHorizons: "https://ssd.jpl.nasa.gov/api/horizons.api (no key)",
      nominatim: "https://nominatim.openstreetmap.org (no key)",
    },
  };
}
