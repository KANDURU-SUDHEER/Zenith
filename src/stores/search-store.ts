"use client";

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchResultType =
  | "city"
  | "coordinate"
  | "planet"
  | "moon"
  | "satellite"
  | "constellation"
  | "country"
  | "observatory"
  | "launch-site"
  | "recent"
  | "favorite";

export interface SearchResult {
  id: string;
  name: string;
  type: SearchResultType;
  subtitle?: string;
  icon?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  /** For satellites: NORAD ID */
  noradId?: number;
  /** For satellites: category */
  category?: string;
  /** For planets: magnitude */
  magnitude?: number;
  /** Generic metadata */
  meta?: Record<string, unknown>;
}

export interface SearchState {
  /** Current query string */
  query: string;
  /** Whether search modal/dropdown is open */
  isOpen: boolean;
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Grouped results */
  results: SearchResult[];
  /** Active (highlighted) index for keyboard nav */
  activeIndex: number;
  /** Currently selected result */
  selectedResult: SearchResult | null;
  /** Recent searches (last 10) */
  recentSearches: SearchResult[];
  /** Favorite searches */
  favorites: SearchResult[];
  /** Error message */
  error: string | null;

  // ─── Actions ─────────────────────────────────────────────────────────────
  setQuery: (query: string) => void;
  setOpen: (open: boolean) => void;
  setSearching: (searching: boolean) => void;
  setResults: (results: SearchResult[]) => void;
  setActiveIndex: (index: number) => void;
  setSelectedResult: (result: SearchResult | null) => void;
  setError: (error: string | null) => void;

  addRecentSearch: (result: SearchResult) => void;
  removeRecentSearch: (id: string) => void;
  clearRecentSearches: () => void;

  addFavorite: (result: SearchResult) => void;
  removeFavorite: (id: string) => void;

  reset: () => void;
}

// ─── Local Storage ───────────────────────────────────────────────────────────

const RECENT_KEY = "zenith_global_recent";
const FAVORITES_KEY = "zenith_global_favorites";
const MAX_RECENT = 10;

function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full */ }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  isOpen: false,
  isSearching: false,
  results: [],
  activeIndex: -1,
  selectedResult: null,
  recentSearches: loadStorage<SearchResult[]>(RECENT_KEY, []),
  favorites: loadStorage<SearchResult[]>(FAVORITES_KEY, []),
  error: null,

  setQuery: (query) => set({ query, activeIndex: -1, error: null }),
  setOpen: (isOpen) => set({ isOpen, activeIndex: -1 }),
  setSearching: (isSearching) => set({ isSearching }),
  setResults: (results) => set({ results }),
  setActiveIndex: (activeIndex) => set({ activeIndex }),
  setSelectedResult: (selectedResult) => set({ selectedResult }),
  setError: (error) => set({ error }),

  addRecentSearch: (result) => {
    const { recentSearches, favorites } = get();
    // Don't add to recents if the item is already a favorite — it will show
    // under Favorites and we don't want it duplicated in Recent Searches.
    if (favorites.some((f) => f.id === result.id)) return;
    const filtered = recentSearches.filter((r) => r.id !== result.id);
    const updated = [{ ...result, type: "recent" as const }, ...filtered].slice(0, MAX_RECENT);
    set({ recentSearches: updated });
    saveStorage(RECENT_KEY, updated);
  },

  removeRecentSearch: (id) => {
    const { recentSearches } = get();
    const updated = recentSearches.filter((r) => r.id !== id);
    set({ recentSearches: updated });
    saveStorage(RECENT_KEY, updated);
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    saveStorage(RECENT_KEY, []);
  },

  addFavorite: (result) => {
    const { favorites, recentSearches } = get();
    if (favorites.some((f) => f.id === result.id)) return;
    const updatedFavorites = [...favorites, result];
    // Remove from recents — it will now appear under Favorites instead.
    const updatedRecents = recentSearches.filter((r) => r.id !== result.id);
    set({ favorites: updatedFavorites, recentSearches: updatedRecents });
    saveStorage(FAVORITES_KEY, updatedFavorites);
    saveStorage(RECENT_KEY, updatedRecents);
  },

  removeFavorite: (id) => {
    const { favorites } = get();
    const updated = favorites.filter((f) => f.id !== id);
    set({ favorites: updated });
    saveStorage(FAVORITES_KEY, updated);
  },

  reset: () => set({ query: "", results: [], activeIndex: -1, isOpen: false, error: null, isSearching: false }),
}));
