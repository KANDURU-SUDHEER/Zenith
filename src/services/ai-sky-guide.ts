/**
 * AI Sky Guide Client Service
 * Supports both streaming and non-streaming responses.
 */

export interface AIContext {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  timezone?: string;
  sunElevation?: number;
  moonPhase?: string;
  moonIllumination?: number;
  visiblePlanets?: string[];
  issVisible?: boolean;
  issAltitude?: number;
  selectedObject?: string;
  localTime?: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/**
 * Build a context string from live application data.
 */
export function buildContextString(ctx: AIContext): string {
  const lines: string[] = [];

  if (ctx.latitude !== undefined && ctx.longitude !== undefined) {
    lines.push(`Observer: ${ctx.locationName || "Unknown"} (${ctx.latitude.toFixed(4)}°, ${ctx.longitude.toFixed(4)}°)`);
  }
  if (ctx.timezone) lines.push(`Timezone: ${ctx.timezone}`);
  if (ctx.localTime) lines.push(`Local time: ${ctx.localTime}`);
  lines.push(`UTC: ${new Date().toISOString()}`);

  if (ctx.sunElevation !== undefined) {
    lines.push(`Sun elevation: ${ctx.sunElevation.toFixed(1)}° (${ctx.sunElevation > 0 ? "above horizon — daytime" : "below horizon — nighttime"})`);
  }
  if (ctx.moonPhase) lines.push(`Moon: ${ctx.moonPhase}, ${ctx.moonIllumination?.toFixed(0)}% illuminated`);
  if (ctx.visiblePlanets && ctx.visiblePlanets.length > 0) {
    lines.push(`Visible planets: ${ctx.visiblePlanets.join(", ")}`);
  }
  if (ctx.issVisible !== undefined) {
    lines.push(`ISS: ${ctx.issVisible ? "currently above observer's horizon" : "not visible from observer"}`);
    if (ctx.issAltitude) lines.push(`ISS altitude: ${ctx.issAltitude.toFixed(0)} km`);
  }
  if (ctx.selectedObject) lines.push(`Currently selected object: ${ctx.selectedObject}`);

  return lines.join("\n");
}

/**
 * Stream AI response from the server.
 * Calls onToken for each text chunk received.
 * Returns the full text when complete.
 */
export async function streamAIResponse(
  query: string,
  context: AIContext,
  history: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const contextStr = buildContextString(context);

  const response = await fetch("/api/ai/sky-guide/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      context: contextStr,
      history: history.slice(-6),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const data = JSON.parse(jsonStr);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          fullText += text;
          onToken(text);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  return fullText;
}

/**
 * Non-streaming fallback (original API).
 */
export async function getAIResponse(
  query: string,
  context?: { latitude?: number; longitude?: number }
): Promise<string> {
  try {
    const response = await fetch("/api/ai/sky-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        latitude: context?.latitude,
        longitude: context?.longitude,
      }),
    });

    if (!response.ok) throw new Error("API failed");
    const data = await response.json();
    return data.response;
  } catch {
    return "I can help you learn about celestial objects. Try asking about planets, the ISS, constellations, or the Moon.";
  }
}
