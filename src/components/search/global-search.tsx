"use client";

import { useRef, useEffect, useCallback, useMemo, memo } from "react";
import {
  Search, X, Loader2, Clock, Star, MapPin, Globe2, Rocket,
  Telescope, Navigation, Satellite as SatelliteIcon, Sparkles, Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchStore, type SearchResult, type SearchResultType } from "@/stores/search-store";
import { executeSearch, groupResults, type SearchResultGroup } from "@/services/search-engine";
import { useOrbitalData } from "@/providers/orbital-engine-provider";
import { useGlobalSearchActions } from "@/hooks/use-global-search-actions";
import { useGeolocation } from "@/hooks/use-geolocation";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 200;

// ─── Component ───────────────────────────────────────────────────────────────

export const GlobalSearch = memo(function GlobalSearch() {
  const {
    query, isOpen, isSearching, results, activeIndex, recentSearches, favorites,
    setQuery, setOpen, setSearching, setResults, setActiveIndex, setError,
    addRecentSearch,
  } = useSearchStore();

  const { satellites } = useOrbitalData();
  const { handleResultSelect } = useGlobalSearchActions();
  const { locate, isLocating } = useGeolocation();

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Ctrl+K Shortcut ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setOpen, isOpen]);

  // ─── Close on Outside Click ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setOpen]);

  // ─── Group Results (derived, no side effect) ─────────────────────────────

  const groups = useMemo<SearchResultGroup[]>(() => {
    if (results.length > 0) {
      return groupResults(results);
    } else if (!query.trim() && isOpen) {
      // Show recents and favorites when empty — deduplicate so a favorite
      // doesn't also appear in the recent list.
      const favoriteIds = new Set(favorites.map((f) => f.id));
      const combined: SearchResult[] = [
        ...favorites.slice(0, 3).map((f) => ({ ...f, type: "favorite" as const })),
        ...recentSearches
          .filter((r) => !favoriteIds.has(r.id))
          .slice(0, 7)
          .map((r) => ({ ...r, type: "recent" as const })),
      ];
      return groupResults(combined);
    }
    return [];
  }, [results, query, isOpen, recentSearches, favorites]);

  // ─── Search Execution ───────────────────────────────────────────────────

  const performSearch = useCallback(
    (q: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      if (!q.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const controller = new AbortController();
      abortRef.current = controller;

      executeSearch({ query: q, satellites, signal: controller.signal })
        .then((searchResults) => {
          if (!controller.signal.aborted) {
            setResults(searchResults);
            setSearching(false);
          }
        })
        .catch((err) => {
          if ((err as Error).name !== "AbortError") {
            setError((err as Error).message);
            setSearching(false);
          }
        });
    },
    [satellites, setResults, setSearching, setError]
  );

  // ─── Query Change Handler ───────────────────────────────────────────────

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setActiveIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [setQuery, setActiveIndex, setResults, setSearching, performSearch]
  );

  // ─── Selection Handler ──────────────────────────────────────────────────

  const onSelect = useCallback(
    (result: SearchResult) => {
      // Store as recent (using original type, not "recent")
      const originalResult = { ...result };
      if (result.type === "recent" || result.type === "favorite") {
        // Preserve the actual object type from the id prefix
        const prefix = result.id.split("-")[0];
        if (prefix === "planet") originalResult.type = "planet";
        else if (prefix === "satellite") originalResult.type = "satellite";
        else if (prefix === "constellation") originalResult.type = "constellation";
        else if (prefix === "city") originalResult.type = "city";
        else if (prefix === "coord") originalResult.type = "coordinate";
        else if (prefix === "country") originalResult.type = "country";
        else if (prefix === "observatory") originalResult.type = "observatory";
        else if (prefix === "launch") originalResult.type = "launch-site";
        else if (prefix === "moon") originalResult.type = "moon";
      }

      addRecentSearch(originalResult);
      handleResultSelect(originalResult);
      setOpen(false);
      setQuery(result.name);
    },
    [addRecentSearch, handleResultSelect, setOpen, setQuery]
  );

  // ─── Flat Results for Keyboard Nav ──────────────────────────────────────

  const flatResults = groups.flatMap((g) => g.results);

  // ─── Keyboard Navigation ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
        setOpen(true);
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex(activeIndex < flatResults.length - 1 ? activeIndex + 1 : 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(activeIndex > 0 ? activeIndex - 1 : flatResults.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < flatResults.length) {
            onSelect(flatResults[activeIndex]!);
          } else if (flatResults.length > 0) {
            onSelect(flatResults[0]!);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          inputRef.current?.blur();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    },
    [isOpen, activeIndex, flatResults, setActiveIndex, setOpen, onSelect]
  );

  // ─── Scroll Active Into View ────────────────────────────────────────────

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ─── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────

  let globalIndex = -1;

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all duration-200",
          isOpen
            ? "border-[rgba(244,165,36,0.4)] bg-[#111215] ring-1 ring-[rgba(244,165,36,0.2)]"
            : "border-[rgba(255,255,255,0.06)] bg-[#111215] hover:border-[rgba(244,165,36,0.3)]"
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-[#A8A9AD]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search anything..."
          className="w-28 bg-transparent text-xs text-[#FAFAF8] placeholder:text-[#75777D] focus:outline-none sm:w-36 md:w-48 lg:w-64"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="global-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          aria-label="Global search — cities, planets, satellites, constellations, coordinates"
        />
        {isSearching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A8A9AD]" aria-label="Searching..." />
        )}
        {query && !isSearching && (
          <button
            onClick={() => { handleQueryChange(""); inputRef.current?.focus(); }}
            className="shrink-0 rounded p-0.5 text-[#75777D] hover:text-[#FAFAF8] transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <kbd className="hidden shrink-0 rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 font-mono text-[10px] text-[#75777D] sm:inline">
          Ctrl+K
        </kbd>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-1/2 top-full z-[9999] mt-2 w-[min(360px,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D0E10] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:w-[min(440px,calc(100vw-1rem))]"
          role="presentation"
        >
          {/* Use Current Location */}
          <button
            onClick={() => { locate(); setOpen(false); handleQueryChange(""); }}
            className="flex w-full items-center gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 py-3 text-left text-xs text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            type="button"
            aria-label="Use current location"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            <span>{isLocating ? "Getting location..." : "Use current location"}</span>
          </button>

          {/* Results */}
          <div ref={listRef} id="global-search-listbox" role="listbox" className="max-h-[420px] overflow-y-auto">
            {groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.type}>
                  {/* Group Header */}
                  <div className="sticky top-0 z-10 bg-[#0D0E10] backdrop-blur-sm px-4 py-2 border-b border-[rgba(255,255,255,0.04)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#75777D]">
                      {group.label}
                    </span>
                  </div>

                  {/* Group Items */}
                  {group.results.map((result) => {
                    globalIndex++;
                    const idx = globalIndex;
                    return (
                      <button
                        key={result.id}
                        id={`search-result-${idx}`}
                        data-index={idx}
                        onClick={() => onSelect(result)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          idx === activeIndex
                            ? "bg-[#E7E3D8] text-[#111111]"
                            : "text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.03)]"
                        )}
                        role="option"
                        aria-selected={idx === activeIndex}
                        type="button"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.03)] text-sm">
                          <ResultIcon type={result.type} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{result.name}</p>
                          {result.subtitle && (
                            <p className="mt-0.5 truncate text-[11px] text-[#75777D]">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        {result.country && result.type !== "country" && (
                          <span className="shrink-0 text-[10px] text-[#75777D]">
                            {result.country}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              !isSearching && query.trim() && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="h-6 w-6 text-[#75777D]" />
                  <p className="mt-3 text-xs text-[#A8A9AD]">No results found</p>
                  <p className="mt-1 text-[11px] text-[#75777D]">
                    Try a city, planet, satellite name, or coordinates
                  </p>
                </div>
              )
            )}

            {/* Searching indicator within results area */}
            {isSearching && results.length === 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-8">
                <Loader2 className="h-4 w-4 animate-spin text-[#A8A9AD]" />
                <span className="text-xs text-[#A8A9AD]">Searching...</span>
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          {(groups.length > 0 || isSearching) && (
            <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2 flex items-center justify-between">
              <p className="text-[10px] text-[#75777D]">
                <kbd className="rounded bg-[rgba(255,255,255,0.03)] px-1 py-0.5 font-mono">↑↓</kbd> navigate
                {" · "}
                <kbd className="rounded bg-[rgba(255,255,255,0.03)] px-1 py-0.5 font-mono">Enter</kbd> select
                {" · "}
                <kbd className="rounded bg-[rgba(255,255,255,0.03)] px-1 py-0.5 font-mono">Esc</kbd> close
              </p>
              <p className="text-[10px] text-[#75777D]">
                {flatResults.length} result{flatResults.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Icon Component ──────────────────────────────────────────────────────────

function ResultIcon({ type }: { type: SearchResultType }) {
  switch (type) {
    case "city":
      return <MapPin className="h-3.5 w-3.5 text-blue-400" />;
    case "coordinate":
      return <Navigation className="h-3.5 w-3.5 text-cosmic-400" />;
    case "planet":
      return <Globe2 className="h-3.5 w-3.5 text-orange-400" />;
    case "moon":
      return <Sparkles className="h-3.5 w-3.5 text-yellow-200" />;
    case "satellite":
      return <SatelliteIcon className="h-3.5 w-3.5 text-purple-400" />;
    case "constellation":
      return <Star className="h-3.5 w-3.5 text-cyan-400" />;
    case "country":
      return <Globe2 className="h-3.5 w-3.5 text-green-400" />;
    case "observatory":
      return <Telescope className="h-3.5 w-3.5 text-indigo-400" />;
    case "launch-site":
      return <Rocket className="h-3.5 w-3.5 text-red-400" />;
    case "recent":
      return <Clock className="h-3.5 w-3.5 text-star-white/30" />;
    case "favorite":
      return <Star className="h-3.5 w-3.5 text-star-gold" />;
    default:
      return <Search className="h-3.5 w-3.5 text-star-white/30" />;
  }
}
