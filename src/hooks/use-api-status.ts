"use client";

import { useQuery } from "@tanstack/react-query";
import {
  checkAllServices,
  getHealthSummary,
  type ServiceHealth,
} from "@/services/api-health";
import { useRef } from "react";

/**
 * Hook for monitoring API health status across all services.
 * Checks every 30 seconds with staggered requests.
 */
export function useApiStatus() {
  const previousHealth = useRef<Map<string, ServiceHealth>>(new Map());

  const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["api-health-status"],
    queryFn: async () => {
      const results = await checkAllServices(previousHealth.current);
      previousHealth.current = results;
      return results;
    },
    refetchInterval: 60_000, // 60 seconds — health checks are informational, not critical
    staleTime: 25_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false, // Don't blast health-check endpoints every tab switch
  });

  const services = data ?? new Map<string, ServiceHealth>();
  const summary = getHealthSummary(services);

  return {
    services,
    summary,
    isLoading,
    lastChecked: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refetch,
  };
}
