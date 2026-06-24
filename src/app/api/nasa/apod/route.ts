import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const { NASA_API_KEY } = getServerEnv();
  const todayUTC = new Date().toISOString().split("T")[0]!;

  try {
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&date=${todayUTC}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (response.status === 429) {
      return NextResponse.json(
        { error: "Rate limited", _source: "rate_limited" },
        { status: 429 }
      );
    }

    if (!response.ok) {
      throw new Error(`NASA APOD returned ${response.status}`);
    }

    const data = await response.json();

    // Cache-Control that expires at exactly UTC midnight
    const now = new Date();
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0
    ));
    const secondsUntilMidnight = Math.max(
      60,
      Math.floor((midnight.getTime() - now.getTime()) / 1000)
    );

    return NextResponse.json(
      { ...data, _source: "live", _date: todayUTC },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${secondsUntilMidnight}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (error) {
    // Fallback — returns minimal valid data with no image URL.
    // The UI handles missing url gracefully (shows placeholder).
    return NextResponse.json(
      {
        title: "Coronal Mass Ejection from the Sun",
        explanation:
          "The Sun's surface is a churning soup of energetic plasma. Magnetic field loops twist and snap, expelling billions of tons of plasma into space — a coronal mass ejection. NASA monitors these events because they can disrupt power grids and satellites on Earth.",
        url: "",
        media_type: "image",
        date: todayUTC,
        copyright: "NASA/SDO",
        _source: "fallback",
        _error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
