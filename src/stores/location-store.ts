"use client";

import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────────────

export type LocationSource = "search" | "globe-click" | "browser" | "favorite" | "coordinates" | "recent";

export interface LocationRecord {
  latitude: number;
  longitude: number;
  name: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone: string;
  displayName: string;
  source: LocationSource;
  timestamp: number;
}

export interface FavoriteLocation {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone: string;
  displayName: string;
  createdAt: number;
}

// ─── Local Storage Keys ─────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "zenith_recent_searches";
const FAVORITES_KEY = "zenith_favorites";
const MAX_RECENT_SEARCHES = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function isDuplicateLocation(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.001 &&
    Math.abs(a.longitude - b.longitude) < 0.001
  );
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Store Interface ────────────────────────────────────────────────────────

interface LocationState {
  // Selected Location (single source of truth)
  selectedLocation: LocationRecord | null;

  // Recent Searches
  recentSearches: LocationRecord[];

  // Favorites
  favorites: FavoriteLocation[];

  // UI State
  isLocating: boolean;
  isReverseGeocoding: boolean;
  error: string | null;

  // Actions — Location
  setLocation: (location: LocationRecord) => void;
  clearLocation: () => void;
  setLocating: (isLocating: boolean) => void;
  setReverseGeocoding: (isReverseGeocoding: boolean) => void;
  setError: (error: string | null) => void;

  // Actions — Recent Searches
  addRecentSearch: (location: LocationRecord) => void;
  removeRecentSearch: (timestamp: number) => void;
  clearRecentSearches: () => void;

  // Actions — Favorites
  addFavorite: (label: string, location: LocationRecord) => void;
  removeFavorite: (id: string) => void;
  renameFavorite: (id: string, newLabel: string) => void;
  clearFavorites: () => void;

  // Hydrate from localStorage (call once on mount)
  hydrate: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  // ─── Initial State ──────────────────────────────────────────────────────

  selectedLocation: null,
  recentSearches: [],
  favorites: [],
  isLocating: false,
  isReverseGeocoding: false,
  error: null,

  // ─── Location Actions ──────────────────────────────────────────────────

  setLocation: (location) => {
    set({ selectedLocation: location, error: null, isLocating: false, isReverseGeocoding: false });

    // Auto-add to recent searches
    const { recentSearches } = get();
    const filtered = recentSearches.filter(
      (r) => !isDuplicateLocation(r, location)
    );
    const updated = [location, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    set({ recentSearches: updated });
    saveToStorage(RECENT_SEARCHES_KEY, updated);
  },

  clearLocation: () => set({ selectedLocation: null, error: null }),

  setLocating: (isLocating) => set({ isLocating }),

  setReverseGeocoding: (isReverseGeocoding) => set({ isReverseGeocoding }),

  setError: (error) => set({ error, isLocating: false, isReverseGeocoding: false }),

  // ─── Recent Searches ──────────────────────────────────────────────────

  addRecentSearch: (location) => {
    const { recentSearches } = get();
    const filtered = recentSearches.filter(
      (r) => !isDuplicateLocation(r, location)
    );
    const updated = [location, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    set({ recentSearches: updated });
    saveToStorage(RECENT_SEARCHES_KEY, updated);
  },

  removeRecentSearch: (timestamp) => {
    const { recentSearches } = get();
    const updated = recentSearches.filter((r) => r.timestamp !== timestamp);
    set({ recentSearches: updated });
    saveToStorage(RECENT_SEARCHES_KEY, updated);
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    saveToStorage(RECENT_SEARCHES_KEY, []);
  },

  // ─── Favorites ────────────────────────────────────────────────────────

  addFavorite: (label, location) => {
    const { favorites } = get();
    // Prevent duplicate favorites
    if (favorites.some((f) => isDuplicateLocation(f, location))) return;

    const newFavorite: FavoriteLocation = {
      id: generateId(),
      label,
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      country: location.country,
      timezone: location.timezone,
      displayName: location.displayName,
      createdAt: Date.now(),
    };
    const updated = [...favorites, newFavorite];
    set({ favorites: updated });
    saveToStorage(FAVORITES_KEY, updated);
  },

  removeFavorite: (id) => {
    const { favorites } = get();
    const updated = favorites.filter((f) => f.id !== id);
    set({ favorites: updated });
    saveToStorage(FAVORITES_KEY, updated);
  },

  renameFavorite: (id, newLabel) => {
    const { favorites } = get();
    const updated = favorites.map((f) =>
      f.id === id ? { ...f, label: newLabel } : f
    );
    set({ favorites: updated });
    saveToStorage(FAVORITES_KEY, updated);
  },

  clearFavorites: () => {
    set({ favorites: [] });
    saveToStorage(FAVORITES_KEY, []);
  },

  // ─── Hydration ────────────────────────────────────────────────────────

  hydrate: () => {
    const recentSearches = loadFromStorage<LocationRecord[]>(RECENT_SEARCHES_KEY, []);
    const favorites = loadFromStorage<FavoriteLocation[]>(FAVORITES_KEY, []);
    set({ recentSearches, favorites });
  },
}));
