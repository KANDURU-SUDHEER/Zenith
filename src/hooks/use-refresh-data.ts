"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/ui/toast";

interface UseRefreshDataReturn {
  refresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: Date | null;
}

/**
 * Hook to refresh all live data (ISS, satellites, planets, constellations, APOD)
 * without affecting the camera, globe state, or markers.
 * Staggered invalidation to avoid simultaneous API spikes.
 */
export function useRefreshData(): UseRefreshDataReturn {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      // Stagger invalidation to avoid simultaneous API calls
      await queryClient.invalidateQueries({ queryKey: ["iss-tle"] });
      await new Promise((r) => setTimeout(r, 100));
      await queryClient.invalidateQueries({ queryKey: ["iss-position"] });
      await new Promise((r) => setTimeout(r, 100));
      await queryClient.invalidateQueries({ queryKey: ["satellites-propagated"] });
      await new Promise((r) => setTimeout(r, 100));
      await queryClient.invalidateQueries({ queryKey: ["celestial-snapshot"] });
      await new Promise((r) => setTimeout(r, 200));
      await queryClient.invalidateQueries({ queryKey: ["apod"] });
      await new Promise((r) => setTimeout(r, 100));
      await queryClient.invalidateQueries({ queryKey: ["api-health-status"] });

      setLastRefreshed(new Date());
      showToast("Live data refreshed", "info", 3000);
    } catch {
      showToast("Failed to refresh data. Please try again.", "error", 4000);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return { refresh, isRefreshing, lastRefreshed };
}
