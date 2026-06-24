import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { z } from "zod";

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { query, latitude, longitude } = parsed.data;
  const { GEMINI_API_KEY } = getServerEnv();

  // If Gemini key is configured, use it
  if (GEMINI_API_KEY) {
    // Try models in order of preference (separate rate limits per model)
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

    for (const model of models) {
      try {
        const locationContext = latitude
          ? `The user is observing from latitude ${latitude.toFixed(2)}°, longitude ${longitude?.toFixed(2)}°.`
          : "";

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an astronomy expert AI assistant for a celestial observation platform called Project Zenith. ${locationContext} Answer the following question concisely and accurately in 2-3 paragraphs. Focus on facts, visibility information, and educational content. Question: ${query}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
              },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return NextResponse.json({ response: text, source: "gemini" });
          }
        } else if (response.status === 429) {
          // Rate limited on this model — try next one
          continue;
        } else if (response.status === 400 || response.status === 404) {
          // Model not available — try next
          continue;
        } else {
          const errorText = await response.text().catch(() => "");
          console.error(`[AI] ${model} error ${response.status}:`, errorText.slice(0, 200));
          continue;
        }
      } catch (err) {
        console.error(`[AI] ${model} fetch failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    }
  }

  // Rule-based fallback — gives informative astronomy answers without API
  const fallbackResponse = getFallbackResponse(query);
  return NextResponse.json({ response: fallbackResponse, source: "knowledge-base" });
}

function getFallbackResponse(query: string): string {
  const lowerQuery = query.toLowerCase();

  const responses: Record<string, string> = {
    mars: "Mars, the Red Planet, is the fourth planet from the Sun at about 228 million km. Its distinctive red color comes from iron oxide on its surface. Mars has two small moons (Phobos and Deimos), the tallest volcano in the solar system (Olympus Mons at 21.9 km), and the longest canyon (Valles Marineris at 4,000 km). Its thin CO₂ atmosphere means surface temperatures range from -125°C to 20°C.",
    venus: "Venus is the second planet from the Sun and the hottest in our solar system (475°C surface temperature). Its thick CO₂ atmosphere creates a runaway greenhouse effect with atmospheric pressure 90× Earth's. Venus rotates backwards (retrograde) so the Sun rises in the west. It's often the brightest object in the sky after the Sun and Moon, visible as the 'morning star' or 'evening star'.",
    jupiter: "Jupiter is the largest planet — 1,321 Earths would fit inside it. Its mass is 2.5× all other planets combined. The Great Red Spot is a storm larger than Earth that's raged for 400+ years. Jupiter has 95 known moons including Europa (subsurface ocean, candidate for life), Ganymede (largest moon in the solar system), and Io (most volcanically active body). It rotates in just 10 hours.",
    saturn: "Saturn is the second largest planet, famous for its ring system spanning 282,000 km but only ~10 meters thick. The rings are made of ice and rock particles. Saturn has 146 known moons including Titan (thick atmosphere, methane lakes) and Enceladus (water geysers, potential habitability). Saturn's density is so low it would float in water if you had a big enough ocean.",
    mercury: "Mercury is the smallest planet and closest to the Sun at 58 million km. Despite being nearest the Sun, it's not the hottest (Venus is). Mercury has no atmosphere, so temperatures range from -180°C at night to 430°C in sunlight. It completes an orbit in just 88 Earth days but rotates so slowly that one Mercury day lasts 176 Earth days.",
    uranus: "Uranus is an ice giant that orbits the Sun on its side — its axis is tilted 98°, likely from a massive ancient collision. It takes 84 Earth years to complete one orbit. Uranus appears blue-green due to methane in its atmosphere. It has 27 known moons named after Shakespeare and Alexander Pope characters, and faint rings discovered in 1977.",
    neptune: "Neptune is the most distant planet at 4.5 billion km from the Sun. It has the strongest winds in the solar system reaching 2,100 km/h. Neptune takes 165 Earth years to orbit the Sun. Its largest moon Triton orbits backwards (retrograde) and has nitrogen geysers. Neptune has a deep blue color from methane absorption of red light.",
    iss: "The International Space Station orbits at ~408 km altitude, traveling at 27,600 km/h, completing one orbit every 92 minutes. It's been continuously occupied since November 2000 — the longest continuous human presence in space. The ISS is the third brightest object in the night sky. It's visible as a bright, steady-moving point crossing the sky in 4-6 minutes during passes.",
    dragon: "SpaceX Dragon is a spacecraft that resupplies the ISS and carries astronauts. Dragon CRS missions carry cargo, while Crew Dragon carries astronauts. It's the first commercial spacecraft to deliver cargo to the ISS (2012) and carry astronauts (2020). Dragon capsules are partially reusable and splash down in the ocean upon return.",
    starlink: "Starlink is SpaceX's satellite internet constellation. Over 6,000 satellites have been launched into LEO at ~550 km altitude. Each satellite weighs about 260 kg and has a flat-panel design with a single solar array. They orbit in shells at different inclinations to provide global coverage. Starlink satellites are sometimes visible as a 'train' of lights shortly after launch.",
    constellation: "Constellations are patterns of stars as seen from Earth. The IAU recognizes 88 official constellations that tile the entire sky. The zodiac constellations lie along the ecliptic (Sun's apparent path). Key constellations: Orion (winter), Scorpius (summer), Ursa Major (contains Big Dipper, year-round in northern hemisphere). Stars in a constellation aren't necessarily close in space.",
    moon: "The Moon is Earth's only natural satellite at 384,400 km distance. It's tidally locked (same face always toward Earth). The lunar cycle is 29.5 days. The Moon has no atmosphere, so temperatures range from -173°C to 127°C. Its gravity is 1/6th Earth's. 12 people walked on it during Apollo (1969-1972). The Moon causes ocean tides and is slowly receding from Earth at 3.8 cm/year.",
    star: "There are an estimated 200-400 billion stars in our Milky Way galaxy, and roughly 2 trillion galaxies in the observable universe. About 9,000 stars are visible to the naked eye, though you can only see ~2,500 from any single location at once. Stars vary enormously — from red dwarfs (0.08 solar masses) to hypergiants (100+ solar masses). Our Sun is a G-type main sequence star, about 4.6 billion years old.",
    sun: "The Sun is a G2V yellow dwarf star, 4.6 billion years old, with surface temperature of 5,500°C and core temperature of 15 million °C. It fuses 600 million tons of hydrogen into helium every second. The Sun is 109× Earth's diameter and contains 99.86% of the solar system's mass. Light from the Sun takes 8 minutes 20 seconds to reach Earth.",
    meteor: "Meteors ('shooting stars') are caused by small space debris burning up in Earth's atmosphere at 11-72 km/s. Major annual showers: Perseids (Aug 12-13, up to 100/hr), Geminids (Dec 13-14, up to 150/hr), Leonids (Nov 17-18), Quadrantids (Jan 3-4). Best viewing: after midnight, dark sky, away from city lights. Fireballs are meteors brighter than Venus.",
    hubble: "The Hubble Space Telescope has orbited Earth since 1990 at ~547 km altitude. Its 2.4-meter mirror captures light from UV to near-infrared. Hubble has made over 1.5 million observations and its data has been used in 19,000+ scientific papers. Key discoveries: age of the universe (13.8 billion years), dark energy, exoplanet atmospheres, and the iconic deep field images.",
    telescope: "For visual astronomy, a good starter telescope is a 6-8 inch Dobsonian reflector — affordable and shows planets, Moon craters, nebulae, and galaxies. Key specs: aperture (light gathering), focal length (magnification range), and mount type. Binoculars (7x50 or 10x50) are excellent for beginners — wide field, easy to use, great for Moon, star clusters, and Milky Way.",
  };

  for (const [key, response] of Object.entries(responses)) {
    if (lowerQuery.includes(key)) {
      return response;
    }
  }

  if (lowerQuery.includes("how many") && lowerQuery.includes("star")) {
    return responses["star"]!;
  }

  if (lowerQuery.includes("what") && lowerQuery.includes("visible")) {
    return "The objects visible in your sky depend on your location, time, and date. Use the Zenith Radar for a real-time view — it calculates the exact positions of the Sun, Moon, planets, ISS, and satellites above your horizon using precise orbital mechanics.";
  }

  if (lowerQuery.includes("when") && (lowerQuery.includes("pass") || lowerQuery.includes("next"))) {
    return "ISS pass predictions depend on your exact location. The ISS orbits at 51.6° inclination, making it visible from most populated areas. The best passes are during twilight when the station is illuminated by the Sun against a dark sky. Check the Details panel for your next ISS pass time.";
  }

  if (lowerQuery.includes("orbit") || lowerQuery.includes("satellite")) {
    return "Satellites orbit Earth at different altitudes: LEO (200-2,000 km) for ISS and Starlink, MEO (2,000-35,786 km) for GPS, and GEO (35,786 km) for communication satellites. Orbital speed decreases with altitude — LEO satellites move at ~7.8 km/s (27,600 km/h), while GEO satellites match Earth's rotation at 3.07 km/s.";
  }

  return "I can answer questions about planets, stars, constellations, satellites (ISS, Starlink, GPS), the Moon, Sun, meteor showers, telescopes, and space missions. Try asking something specific like 'Tell me about Jupiter' or 'When is the next meteor shower?'";
}
