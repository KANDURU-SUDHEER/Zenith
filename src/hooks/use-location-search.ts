"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchLocations, parseCoordinates, reverseGeocode, estimateTimezone, formatLocationName, type NominatimResult } from "@/lib/geocoding";
import { useLocationStore, type LocationRecord } from "@/stores/location-store";

const DEBOUNCE_MS = 300;

export interface SearchSuggestion {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  country?: string;
  type: "result" | "coordinate" | "recent" | "favorite";
}

interface UseLocationSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  suggestions: SearchSuggestion[];
  isSearching: boolean;
  error: string | null;
  activeIndex: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleSelect: (suggestion: SearchSuggestion) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  clearSearch: () => void;
}

export function useLocationSearch(): UseLocationSearchReturn {
  const [query, setQueryState] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setLocation = useLocationStore((s) => s.setLocation);
  const recentSearches = useLocationStore((s) => s.recentSearches);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      setActiveIndex(-1);
      setError(null);

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Empty query: show recent searches
      if (!value.trim()) {
        const recentSuggestions: SearchSuggestion[] = recentSearches.slice(0, 5).map((r, i) => ({
          id: `recent-${i}`,
          name: r.name,
          displayName: r.displayName,
          latitude: r.latitude,
          longitude: r.longitude,
          country: r.country,
          type: "recent" as const,
        }));
        setSuggestions(recentSuggestions);
        setIsOpen(true);
        setIsSearching(false);
        return;
      }

      // Check if input is coordinates
      const coords = parseCoordinates(value);
      if (coords) {
        setSuggestions([
          {
            id: "coord-parsed",
            name: `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`,
            displayName: `Go to coordinates: ${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            type: "coordinate",
          },
        ]);
        setIsOpen(true);
        setIsSearching(false);
        return;
      }

      // Debounced API search
      if (value.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const results = await searchLocations({
            query: value.trim(),
            limit: 8,
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          const mapped: SearchSuggestion[] = results.map((r: NominatimResult) => ({
            id: `result-${r.place_id}`,
            name: formatLocationName(r),
            displayName: r.display_name,
            latitude: parseFloat(r.lat),
            longitude: parseFloat(r.lon),
            country: r.address?.country,
            type: "result" as const,
          }));

          setSuggestions(mapped);
          setIsOpen(mapped.length > 0);
          setError(mapped.length === 0 ? "No results found" : null);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setError((err as Error).message || "Search failed");
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, DEBOUNCE_MS);
    },
    [recentSearches]
  );

  const handleSelect = useCallback(
    async (suggestion: SearchSuggestion) => {
      setQueryState(suggestion.name);
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);

      // Reverse geocode to get full details
      try {
        const geo = await reverseGeocode(suggestion.latitude, suggestion.longitude);
        const timezone = estimateTimezone(suggestion.longitude);

        const record: LocationRecord = {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          name: suggestion.name || geo.name,
          city: geo.city,
          district: geo.district,
          state: geo.state,
          country: suggestion.country || geo.country,
          postalCode: geo.postalCode,
          timezone,
          displayName: geo.displayName || suggestion.displayName,
          source: suggestion.type === "recent" ? "recent" : suggestion.type === "favorite" ? "favorite" : suggestion.type === "coordinate" ? "coordinates" : "search",
          timestamp: Date.now(),
        };

        setLocation(record);
      } catch {
        // Fallback without reverse geocoding
        const timezone = estimateTimezone(suggestion.longitude);
        const record: LocationRecord = {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          name: suggestion.name,
          country: suggestion.country,
          timezone,
          displayName: suggestion.displayName,
          source: "search",
          timestamp: Date.now(),
        };
        setLocation(record);
      }
    },
    [setLocation]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          // Open suggestions on arrow down when empty
          if (!query.trim() && recentSearches.length > 0) {
            const recentSuggestions: SearchSuggestion[] = recentSearches.slice(0, 5).map((r, i) => ({
              id: `recent-${i}`,
              name: r.name,
              displayName: r.displayName,
              latitude: r.latitude,
              longitude: r.longitude,
              country: r.country,
              type: "recent" as const,
            }));
            setSuggestions(recentSuggestions);
            setIsOpen(true);
          }
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            const selected = suggestions[activeIndex];
            if (selected) handleSelect(selected);
          } else if (suggestions.length > 0) {
            const first = suggestions[0];
            if (first) handleSelect(first);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, activeIndex, suggestions, handleSelect, query, recentSearches]
  );

  const clearSearch = useCallback(() => {
    setQueryState("");
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setError(null);
  }, []);

  return {
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
  };
}
