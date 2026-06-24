import { NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().min(1).max(2000),
  context: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    text: z.string(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const { query, context, history } = parsed.data;
  const { GEMINI_API_KEY } = getServerEnv();

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API not configured" }), { status: 503 });
  }

  const systemPrompt = `You are the AI Sky Guide for Project Zenith — a real-time celestial observation platform. You are an expert astronomer speaking to a curious observer.

RULES:
- Be concise but informative (2-4 paragraphs max)
- Use the live context data provided to give accurate, observer-specific answers
- When asked about visibility, use the provided elevation/azimuth data
- Format responses with markdown: use **bold** for emphasis, bullet points for lists
- Include relevant numbers: distances, magnitudes, angles
- End responses with 1-2 follow-up suggestions the user might find interesting
- Never hallucinate data — if live data is provided, use it; if not, say "select a location for live data"
- Sound like a NASA scientist speaking to a curious person — warm, knowledgeable, precise

LIVE OBSERVATION CONTEXT:
${context || "No location selected yet."}`;

  // Build conversation history for Gemini
  const contents = [];

  // Add history
  if (history && history.length > 0) {
    for (const msg of history.slice(-6)) { // Last 6 messages for context window
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }
  }

  // Add current query
  contents.push({
    role: "user",
    parts: [{ text: query }],
  });

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );

      if (response.status === 429) continue;
      if (response.status === 404 || response.status === 400) continue;
      if (!response.ok) {
        console.error(`[AI Stream] ${model} error ${response.status}`);
        continue;
      }

      // Stream the response
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      console.error(`[AI Stream] ${model} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
  }

  // All streaming models failed — try non-streaming as last resort
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) continue;
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const sseData = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\ndata: [DONE]\n\n`;
        return new Response(sseData, {
          headers: { "Content-Type": "text/event-stream" },
        });
      }
    } catch {
      continue;
    }
  }

  // All models failed — return fallback as a single SSE event
  const fallback = getFallback(query);
  const sseData = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: fallback }] } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(sseData, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function getFallback(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("dragon")) return "**SpaceX Dragon** is a reusable spacecraft that carries cargo and crew to the ISS.\n\n- **Crew Dragon** carries up to 7 astronauts and has been operational since 2020\n- **Cargo Dragon** resupplies the ISS with food, experiments, and equipment\n- Dragon capsules splash down in the ocean and are refurbished for reuse\n- It was the first commercial spacecraft to dock with the ISS (2012) and the first to carry NASA astronauts since the Space Shuttle (2020)\n\nYou can track Dragon missions on the Globe view when they're in orbit!";
  if (q.includes("starlink")) return "**Starlink** is SpaceX's satellite internet constellation with 6,000+ satellites in LEO at ~550 km.\n\n- Each satellite weighs ~260 kg with a flat-panel design\n- They're visible as a 'train' of lights shortly after launch\n- The constellation provides broadband internet globally\n\nYou can see tracked Starlink satellites on the Globe view!";
  if (q.includes("planet") || q.includes("visible")) return "To see which planets are visible, select a location on the globe or search for your city. The radar view will show all celestial objects above your horizon with real-time positions.";
  if (q.includes("iss")) return "The **ISS** orbits at ~408 km altitude at 27,600 km/h, completing one orbit every 92 minutes. It's been continuously occupied since November 2000.\n\nCheck the Globe view for its current position (gold dot) and the Details panel for your next pass prediction!";
  if (q.includes("moon")) return "The Moon's current phase and position are shown in the Radar view. Select a location to see exact rise/set times and illumination percentage.";
  if (q.includes("sun")) return "Sun position including sunrise, sunset, and twilight times are calculated for your selected location. Check the Details panel for complete solar data.";
  if (q.includes("mars")) return "**Mars** is the fourth planet from the Sun at ~228 million km. Its red color comes from iron oxide. Mars has the tallest volcano (Olympus Mons, 21.9 km) and longest canyon (Valles Marineris, 4,000 km) in the solar system.";
  if (q.includes("jupiter")) return "**Jupiter** is the largest planet — 1,321 Earths would fit inside. The Great Red Spot is a storm larger than Earth that's lasted 400+ years. Jupiter has 95 known moons including Europa (subsurface ocean) and Ganymede (largest moon in the solar system).";
  if (q.includes("saturn")) return "**Saturn** is famous for its ring system spanning 282,000 km but only ~10 meters thick. It has 146 known moons including Titan (with a thick atmosphere and methane lakes) and Enceladus (water geysers).";
  if (q.includes("venus")) return "**Venus** is the hottest planet (475°C) due to its thick CO₂ atmosphere creating a runaway greenhouse effect. It rotates backwards, so the Sun rises in the west. Often visible as the bright 'morning star' or 'evening star'.";
  if (q.includes("constellation")) return "The IAU recognizes 88 official constellations. Key ones: **Orion** (winter), **Scorpius** (summer), **Ursa Major** (Big Dipper, year-round in northern hemisphere). Use the Radar view to see which are above your horizon!";
  if (q.includes("meteor") || q.includes("shower")) return "Major annual meteor showers: **Perseids** (Aug 12-13, ~100/hr), **Geminids** (Dec 13-14, ~150/hr), **Leonids** (Nov 17-18). Best viewing: after midnight, dark sky, away from city lights.";
  return "I'm your astronomy guide! Ask me about planets, the Moon, ISS, satellites (Dragon, Starlink), constellations, meteor showers, or any celestial object. Select a location first for live, observer-specific data.";
}
