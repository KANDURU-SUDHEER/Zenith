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
    // Fallback to a verified live APOD image
    return NextResponse.json(
      {
        title: "Pillars of Creation",
        explanation:
          "The Pillars of Creation are towering columns of interstellar gas and dust in the Eagle Nebula, photographed by the James Webb Space Telescope. These columns are active regions where new stars are forming within the dense gas.",
        url: "https://apod.nasa.gov/apod/image/2211/PillarsOfCreation_Webb_1080.jpg",
        hdurl: "https://apod.nasa.gov/apod/image/2211/PillarsOfCreation_Webb_1080.jpg",
        media_type: "image",
        date: todayUTC,
        copyright: "NASA, ESA, CSA, STScI",
        _source: "fallback",
        _error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
