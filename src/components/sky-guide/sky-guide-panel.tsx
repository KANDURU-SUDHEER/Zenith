"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, X, Square, Trash2, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamAIResponse, type AIContext, type ChatMessage } from "@/services/ai-sky-guide";
import { useLocationStore } from "@/stores/location-store";
import { useCelestialEngine } from "@/hooks/use-celestial-engine";
import { useISSTracker } from "@/hooks/use-iss-tracker";
import { useSatelliteStore } from "@/stores/satellite-store";
import { computeLookAngles } from "@/services/visibility-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface SkyGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Suggested Prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { emoji: "🪐", text: "What planets are visible right now?" },
  { emoji: "🌙", text: "Tell me about today's moon phase" },
  { emoji: "🛰️", text: "Where is the ISS?" },
  { emoji: "⭐", text: "What's the brightest object in my sky?" },
  { emoji: "🌅", text: "When is sunset today?" },
  { emoji: "🔭", text: "Best thing to observe tonight?" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function SkyGuidePanel({ isOpen, onClose }: SkyGuidePanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI Sky Guide — a specialized astronomy assistant integrated with Project Zenith's live data. Ask me about planets, the Moon, ISS, satellites, constellations, or anything in the sky above you.",
      timestamp: 0,
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Live context sources
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { sun, moon, planets } = useCelestialEngine();
  const { issData } = useISSTracker();
  const selectedSatellite = useSatelliteStore((s) => s.selectedSatellite);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened — cancel on unmount to avoid calling focus on detached ref
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Build live context for AI
  const getLiveContext = useCallback((): AIContext => {
    const ctx: AIContext = {};
    if (selectedLocation) {
      ctx.latitude = selectedLocation.latitude;
      ctx.longitude = selectedLocation.longitude;
      ctx.locationName = selectedLocation.name;
      ctx.timezone = selectedLocation.timezone;
      ctx.localTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (sun) ctx.sunElevation = sun.elevation;
    if (moon) {
      ctx.moonPhase = moon.phase;
      ctx.moonIllumination = moon.illumination;
    }
    if (planets) {
      ctx.visiblePlanets = planets.filter((p) => p.isVisible).map((p) => `${p.name} (El: ${p.elevation.toFixed(1)}°, Mag: ${p.magnitude.toFixed(1)})`);
    }
    if (issData && selectedLocation) {
      const angles = computeLookAngles(
        { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
        { latitude: issData.latitude, longitude: issData.longitude, altitude: issData.altitude }
      );
      ctx.issVisible = angles.elevation > 0;
      ctx.issAltitude = issData.altitude;
    }
    if (selectedSatellite) ctx.selectedObject = selectedSatellite.name;
    return ctx;
  }, [selectedLocation, sun, moon, planets, issData, selectedSatellite]);

  // Send message with streaming
  const handleSend = useCallback(async (text?: string) => {
    const query = (text || input).trim();
    if (!query || isStreaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: query, timestamp: Date.now() };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "", timestamp: Date.now(), isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    // Build history for context using ref to avoid stale closure
    const history: ChatMessage[] = messagesRef.current
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role === "user" ? "user" as const : "model" as const, text: m.content }));

    try {
      await streamAIResponse(
        query,
        getLiveContext(),
        history,
        (token) => {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id ? { ...m, content: m.content + token } : m)
          );
        },
        abort.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Streaming failed — try non-streaming fallback
        try {
          const { getAIResponse } = await import("@/services/ai-sky-guide");
          const fallbackText = await getAIResponse(query, {
            latitude: getLiveContext().latitude,
            longitude: getLiveContext().longitude,
          });
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id
              ? { ...m, content: fallbackText }
              : m)
          );
        } catch {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id
              ? { ...m, content: m.content || "I couldn't connect right now. Try asking about a specific planet, the Moon, ISS, or constellations — I have built-in knowledge to help!" }
              : m)
          );
        }
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, isStreaming: false } : m));
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, getLiveContext]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Conversation cleared. How can I help you explore the sky?",
      timestamp: Date.now(),
    }]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-0 right-0 top-0 z-40 flex w-full flex-col border-l border-border-cream/30 bg-gradient-to-b from-space-900 to-space-950 backdrop-blur-xl shadow-2xl sm:w-[420px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-cream/30 bg-gradient-to-br from-cherry-900/10 to-transparent px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cherry-600 to-cherry-800 shadow-lg sm:h-10 sm:w-10">
                <Sparkles className="h-4 w-4 text-cream-100 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cream-100 sm:text-base">AI Sky Guide</h3>
                <p className="text-xs font-medium text-cream-600">Live astronomy assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="rounded-xl p-2 text-cream-500 hover:bg-surface-glass-cream hover:text-cream-200 transition-all"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-cream-500 hover:bg-cherry-700/20 hover:text-cherry-300 transition-all"
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 sm:px-5 sm:py-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cherry-600/20 to-cherry-800/20 ring-1 ring-cherry-500/30">
                    <Bot className="h-4 w-4 text-cherry-300" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-cherry-700/30 to-cherry-800/30 text-cream-100 ring-1 ring-cherry-500/30"
                      : "bg-surface-glass-cream text-cream-200 ring-1 ring-border-subtle"
                  }`}
                >
                  <MarkdownContent content={msg.content} />
                  {msg.isStreaming && <span className="ml-1 inline-block h-3.5 w-0.5 animate-pulse bg-cherry-400" />}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cherry-600/20 to-cherry-800/20 ring-1 ring-cherry-500/30">
                    <User className="h-4 w-4 text-cherry-300" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="border-t border-border-cream/30 px-4 py-3 sm:py-4">
              <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => handleSend(p.text)}
                    className="rounded-xl border border-border-cream bg-surface-glass-cream px-3 py-2.5 text-left text-xs font-medium text-cream-300 transition-all hover:border-cherry-500/30 hover:bg-cherry-700/10 hover:text-cream-100 min-h-[44px]"
                  >
                    <span className="mr-1.5">{p.emoji}</span> {p.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border-cream/30 bg-gradient-to-br from-cherry-900/5 to-transparent p-3 sm:p-4">
            <div className="flex items-center gap-3 rounded-xl border border-border-cream bg-surface-glass-cream px-4 py-3 focus-within:border-cherry-500/50 focus-within:ring-2 focus-within:ring-cherry-500/20 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the sky..."
                className="flex-1 bg-transparent text-sm font-medium text-cream-100 placeholder:text-cream-600 focus:outline-none"
                aria-label="Ask the AI Sky Guide"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button onClick={handleStop} className="rounded-lg p-2 text-red-400 hover:bg-red-500/20 transition-all" aria-label="Stop">
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="rounded-lg p-2 text-cherry-400 hover:bg-cherry-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Safe Markdown Renderer ───────────────────────────────────────────────────
// Renders a strict subset of Markdown without dangerouslySetInnerHTML.
// All text nodes are rendered as plain React children — no HTML injection possible.

interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Use a key that combines position + a short content fingerprint so
        // React doesn't reuse DOM nodes when streaming prepends/inserts lines.
        // Pure index keys cause incorrect reconciliation during token streaming.
        const key = `${i}:${line.slice(0, 20)}`;

        // Empty line → spacer
        if (line.trim() === "") return <br key={key} />;

        // ## Header
        if (line.startsWith("## ")) {
          return (
            <p key={key} className="font-medium text-white/90 mt-2">
              <InlineFormatted text={line.slice(3)} />
            </p>
          );
        }

        // Bullet point (- or •)
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={key} className="relative pl-3">
              <span className="absolute left-0 text-indigo-400">•</span>
              <InlineFormatted text={line.slice(2)} />
            </p>
          );
        }

        return (
          <p key={key}>
            <InlineFormatted text={line} />
          </p>
        );
      })}
    </div>
  );
}

/** Renders **bold** spans as React elements — no HTML string injection. */
function InlineFormatted({ text }: { text: string }) {
  // Split on **...**  pattern
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-white font-medium">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
