"use client";

import { useRef, useEffect, useCallback, memo } from "react";
import { Search, MapPin, Loader2, X, Clock, Star, Navigation, Crosshair } from "lucide-react";
import { useLocationSearch, type SearchSuggestion } from "@/hooks/use-location-search";
import { useLocationStore } from "@/stores/location-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { cn } from "@/lib/utils";

export const LocationSearch = memo(function LocationSearch() {
  const {
    query,
    setQuery,
    suggestions,
    isSearching,
    error,
    activeIndex,
    isOpen,
    setIsOpen,
    handleSelect,
    handleKeyDown,
    clearSearch,
  } = useLocationSearch();

  const recentSearches = useLocationStore((s) => s.recentSearches);
  const favorites = useLocationStore((s) => s.favorites);
  const { locate, isLocating } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  // Show recents/favorites on focus when query is empty
  const handleFocus = useCallback(() => {
    if (!query.trim()) {
      setQuery(""); // triggers recent searches display
    }
  }, [query, setQuery]);

  // Highlight matching text in suggestions
  const highlightMatch = useCallback(
    (text: string) => {
      if (!query.trim()) return <span>{text}</span>;
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) =>
            regex.test(part) ? (
              <mark key={i} className="bg-cosmic-500/30 text-cosmic-200 rounded-sm px-0.5">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    },
    [query]
  );

  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "recent":
        return <Clock className="h-3.5 w-3.5 text-star-white/30" />;
      case "favorite":
        return <Star className="h-3.5 w-3.5 text-star-gold" />;
      case "coordinate":
        return <Navigation className="h-3.5 w-3.5 text-cosmic-400" />;
      default:
        return <MapPin className="h-3.5 w-3.5 text-star-white/40" />;
    }
  };

  // Build combined suggestions: favorites first (when empty), then API results
  const displaySuggestions: SearchSuggestion[] = (() => {
    if (query.trim()) return suggestions;

    // When empty: show favorites then recents
    const favSuggestions: SearchSuggestion[] = favorites.slice(0, 3).map((f) => ({
      id: `fav-${f.id}`,
      name: f.label,
      displayName: f.displayName,
      latitude: f.latitude,
      longitude: f.longitude,
      country: f.country,
      type: "favorite" as const,
    }));

    const recentSuggestions: SearchSuggestion[] = recentSearches.slice(0, 5).map((r, i) => ({
      id: `recent-${i}`,
      name: r.name,
      displayName: r.displayName,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      type: "recent" as const,
    }));

    return [...favSuggestions, ...recentSuggestions];
  })();

  const showDropdown = isOpen;

  const handleUseCurrentLocation = useCallback(() => {
    locate();
    setIsOpen(false);
    clearSearch();
  }, [locate, setIsOpen, clearSearch]);

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all duration-200",
          showDropdown
            ? "border-border-active bg-surface-secondary ring-1 ring-cosmic-400/20"
            : "border-border-subtle bg-surface-secondary hover:border-border-active"
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-star-white/40" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search city, country, or coordinates..."
          className="w-36 bg-transparent text-xs text-star-white placeholder:text-star-white/30 focus:outline-none sm:w-48 lg:w-64"
          role="combobox"
          aria-expanded={showDropdown ? true : false}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="location-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          aria-label="Search for a location"
        />
        {isSearching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cosmic-400" aria-label="Searching..." />
        )}
        {query && !isSearching && (
          <button
            onClick={clearSearch}
            className="shrink-0 rounded p-0.5 text-star-white/40 hover:text-star-white transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border-subtle bg-surface-primary/95 shadow-2xl backdrop-blur-xl sm:w-[min(384px,calc(100vw-1rem))]"
          role="presentation"
        >
          {/* Use Current Location */}
          <button
            onClick={handleUseCurrentLocation}
            className="flex w-full items-center gap-3 border-b border-border-subtle px-4 py-3 text-left text-xs text-cosmic-300 hover:bg-surface-glass transition-colors"
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

          {/* Section headers */}
          {!query.trim() && favorites.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-star-white/30">
                Favorites
              </span>
            </div>
          )}

          {/* Suggestions List */}
          <ul
            ref={listRef}
            id="location-search-listbox"
            role="listbox"
            className="max-h-72 overflow-y-auto"
            aria-label="Location suggestions"
          >
            {displaySuggestions.map((suggestion, index) => {
              // Insert "Recent" header
              const isFirstRecent =
                !query.trim() &&
                suggestion.type === "recent" &&
                (index === 0 || displaySuggestions[index - 1]?.type === "favorite");

              return (
                <li key={suggestion.id}>
                  {isFirstRecent && (
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-star-white/30">
                        Recent
                      </span>
                    </div>
                  )}
                  <button
                    id={`suggestion-${index}`}
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      index === activeIndex
                        ? "bg-cosmic-500/10 text-star-white"
                        : "text-star-white/80 hover:bg-surface-glass"
                    )}
                    role="option"
                    aria-selected={index === activeIndex}
                    type="button"
                  >
                    <span className="mt-0.5 shrink-0">
                      {getSuggestionIcon(suggestion.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {highlightMatch(suggestion.name)}
                      </p>
                      {suggestion.country && suggestion.country !== suggestion.name && (
                        <p className="mt-0.5 truncate text-[11px] text-star-white/40">
                          {suggestion.country}
                        </p>
                      )}
                    </div>
                    {suggestion.type === "coordinate" && (
                      <span className="shrink-0 rounded bg-cosmic-500/10 px-1.5 py-0.5 text-[10px] text-cosmic-300">
                        coords
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Empty State */}
          {!isSearching && displaySuggestions.length === 0 && error && (
            <div className="px-4 py-6 text-center">
              <MapPin className="mx-auto h-5 w-5 text-star-white/20" />
              <p className="mt-2 text-xs text-star-white/40">{error}</p>
              <p className="mt-1 text-[11px] text-star-white/25">
                Try searching for a city, town, or enter coordinates
              </p>
            </div>
          )}

          {/* Loading State */}
          {isSearching && displaySuggestions.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-cosmic-400" />
              <span className="text-xs text-star-white/40">Searching...</span>
            </div>
          )}

          {/* Keyboard hint */}
          {displaySuggestions.length > 0 && (
            <div className="border-t border-border-subtle px-4 py-2">
              <p className="text-[10px] text-star-white/25">
                <kbd className="rounded bg-surface-glass px-1 py-0.5 font-mono">↑↓</kbd> navigate
                {" · "}
                <kbd className="rounded bg-surface-glass px-1 py-0.5 font-mono">Enter</kbd> select
                {" · "}
                <kbd className="rounded bg-surface-glass px-1 py-0.5 font-mono">Esc</kbd> close
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
