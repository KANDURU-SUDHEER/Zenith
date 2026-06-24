"use client";

import { useCallback, memo } from "react";
import { Clock, Trash2, X, MapPin } from "lucide-react";
import { useLocationStore, type LocationRecord } from "@/stores/location-store";
import { showToast } from "@/components/ui/toast";

export const RecentSearchesPanel = memo(function RecentSearchesPanel({ maxItems }: { maxItems?: number }) {
  const recentSearches = useLocationStore((s) => s.recentSearches);
  const displayedSearches = maxItems ? recentSearches.slice(0, maxItems) : recentSearches;
  const setLocation = useLocationStore((s) => s.setLocation);
  const removeRecentSearch = useLocationStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useLocationStore((s) => s.clearRecentSearches);

  const handleSelect = useCallback(
    (recent: LocationRecord) => {
      const record: LocationRecord = {
        ...recent,
        source: "recent",
        timestamp: Date.now(),
      };
      setLocation(record);
    },
    [setLocation]
  );

  const handleRemove = useCallback(
    (timestamp: number) => {
      removeRecentSearch(timestamp);
    },
    [removeRecentSearch]
  );

  const handleClearAll = useCallback(() => {
    clearRecentSearches();
    showToast("Recent searches cleared", "info");
  }, [clearRecentSearches]);

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-sky-900/10 to-transparent p-3 ring-1 ring-sky-500/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-700">
            <Clock className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-cream-100">Recent</span>
        </div>
        {recentSearches.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all ring-1 ring-red-500/30"
            aria-label="Clear all recent searches"
            type="button"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Recent List */}
      {recentSearches.length === 0 ? (
        <p className="py-4 text-center text-xs text-cream-600 leading-relaxed">
          No recent searches
        </p>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Recent location searches">
          {displayedSearches.map((recent) => (
            <li key={recent.timestamp}>
              <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all bg-surface-glass-cream hover:bg-gradient-to-br hover:from-surface-glass-cream hover:to-transparent ring-1 ring-border-subtle hover:ring-sky-500/30">
                <MapPin className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                <button
                  onClick={() => handleSelect(recent)}
                  className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                  type="button"
                  aria-label={`Go to ${recent.name}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-cream-200">{recent.name}</p>
                    {recent.country && (
                      <p className="truncate text-xs text-cream-600 mt-0.5">{recent.country}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-cream-600">
                    {formatTimeAgo(recent.timestamp)}
                  </span>
                </button>
                <button
                  onClick={() => handleRemove(recent.timestamp)}
                  className="shrink-0 rounded-lg p-1.5 text-cream-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  aria-label={`Remove ${recent.name} from history`}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
