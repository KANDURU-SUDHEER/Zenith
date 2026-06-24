"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 300_000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
            // Don't refetch on window focus — individual queries that need this
            // set it explicitly (none currently do). Prevents burst requests on tab switch.
            refetchOnWindowFocus: false,
            // Only fetch on mount if data is stale, not always.
            // "always" causes every component mount to fire a request.
            refetchOnMount: true,
            networkMode: "offlineFirst",
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
