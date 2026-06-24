"use client";

import { useState, useCallback, memo } from "react";
import { Star, Trash2, Pencil, Check, X } from "lucide-react";
import { useLocationStore, type LocationRecord, type FavoriteLocation } from "@/stores/location-store";
import { estimateTimezone } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export const FavoritesPanel = memo(function FavoritesPanel() {
  const favorites = useLocationStore((s) => s.favorites);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const setLocation = useLocationStore((s) => s.setLocation);
  const addFavorite = useLocationStore((s) => s.addFavorite);
  const removeFavorite = useLocationStore((s) => s.removeFavorite);
  const renameFavorite = useLocationStore((s) => s.renameFavorite);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAddCurrent = useCallback(() => {
    if (!selectedLocation) {
      showToast("Select a location first to add it as a favorite", "info");
      return;
    }
    const label = selectedLocation.name || `${selectedLocation.latitude.toFixed(2)}°, ${selectedLocation.longitude.toFixed(2)}°`;
    addFavorite(label, selectedLocation);
    showToast(`"${label}" added to favorites`, "info");
  }, [selectedLocation, addFavorite]);

  const handleSelectFavorite = useCallback(
    (fav: FavoriteLocation) => {
      const record: LocationRecord = {
        latitude: fav.latitude,
        longitude: fav.longitude,
        name: fav.label,
        city: fav.city,
        country: fav.country,
        timezone: fav.timezone || estimateTimezone(fav.longitude),
        displayName: fav.displayName,
        source: "favorite",
        timestamp: Date.now(),
      };
      setLocation(record);
    },
    [setLocation]
  );

  const handleStartRename = useCallback((fav: FavoriteLocation) => {
    setEditingId(fav.id);
    setEditValue(fav.label);
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameFavorite(editingId, editValue.trim());
      showToast("Favorite renamed", "info");
    }
    setEditingId(null);
    setEditValue("");
  }, [editingId, editValue, renameFavorite]);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  const handleRemove = useCallback(
    (id: string, label: string) => {
      removeFavorite(id);
      showToast(`Removed "${label}" from favorites`, "info");
    },
    [removeFavorite]
  );

  const isFavorite = selectedLocation
    ? favorites.some(
        (f) =>
          Math.abs(f.latitude - selectedLocation.latitude) < 0.001 &&
          Math.abs(f.longitude - selectedLocation.longitude) < 0.001
      )
    : false;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.03)] p-3 ring-1 ring-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)]">
            <Star className="h-3.5 w-3.5 text-[#A8A9AD]" />
          </div>
          <span className="text-sm font-bold text-cream-100">Favorites</span>
        </div>
        {selectedLocation && !isFavorite && (
          <button
            onClick={handleAddCurrent}
            className="flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-xs font-bold text-[#A8A9AD] hover:bg-[rgba(255,255,255,0.10)] hover:text-[#FAFAF8] transition-all ring-1 ring-[rgba(255,255,255,0.08)]"
            aria-label="Add current location to favorites"
            type="button"
          >
            <Star className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Favorites List */}
      {favorites.length === 0 ? (
        <p className="py-4 text-center text-xs text-cream-600 leading-relaxed">
          No favorites yet. Select a location and click Add.
        </p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Favorite locations">
          {favorites.map((fav) => (
            <li key={fav.id}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  "bg-surface-glass-cream hover:bg-gradient-to-br hover:from-surface-glass-cream hover:to-transparent ring-1 ring-border-subtle hover:ring-[rgba(255,255,255,0.12)]"
                )}
              >
                <Star className="h-4 w-4 shrink-0 text-[#75777D]" aria-hidden="true" />

                {editingId === fav.id ? (
                  // Rename mode
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename();
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      className="flex-1 rounded-lg bg-surface-secondary px-3 py-1.5 text-sm font-medium text-cream-100 ring-2 ring-cherry-500/50 focus:outline-none"
                      autoFocus
                      aria-label="Rename favorite"
                    />
                    <button
                      onClick={handleConfirmRename}
                      className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10"
                      aria-label="Confirm rename"
                      type="button"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1.5 text-cream-500 hover:text-cream-300 rounded-lg hover:bg-surface-glass-cream"
                      aria-label="Cancel rename"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  // Display mode
                  <>
                    <button
                      onClick={() => handleSelectFavorite(fav)}
                      className="flex flex-1 items-center gap-2.5 text-left"
                      type="button"
                      aria-label={`Fly to ${fav.label}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-cream-200">
                          {fav.label}
                        </p>
                        {fav.country && (
                          <p className="truncate text-xs text-cream-600 mt-0.5">
                            {fav.country}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartRename(fav)}
                        className="rounded-lg p-1.5 text-cream-500 hover:bg-surface-glass-cream hover:text-cream-200"
                        aria-label={`Rename ${fav.label}`}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(fav.id, fav.label)}
                        className="rounded-lg p-1.5 text-cream-500 hover:bg-red-500/20 hover:text-red-400"
                        aria-label={`Remove ${fav.label} from favorites`}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
