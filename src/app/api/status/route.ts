import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Status endpoint — reports which APIs are configured.
 * Reads process.env at runtime (no build-time inlining).
 */
export async function GET() {
  const nasaKey = process.env.NASA_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const cesiumToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

  const status = {
    nasa: {
      configured: nasaKey.length > 0 && nasaKey !== "DEMO_KEY",
      usingDemoKey: nasaKey === "DEMO_KEY",
      keyPresent: nasaKey.length > 0,
    },
    gemini: {
      configured: geminiKey.length > 0,
    },
    cesiumIon: {
      configured: cesiumToken.length > 0,
    },
    publicApis: {
      whereTheISS: "✅ https://api.wheretheiss.at (no key)",
      openNotify: "✅ http://api.open-notify.org (no key)",
      celestrak: "✅ https://celestrak.org (no key)",
      jplHorizons: "✅ https://ssd.jpl.nasa.gov/api/horizons.api (no key)",
      nominatim: "✅ https://nominatim.openstreetmap.org (no key)",
    },
  };

  return NextResponse.json(status);
}
