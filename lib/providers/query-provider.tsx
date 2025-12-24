"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data considered fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache time: keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed queries 1 time
            retry: 1,
            // Refetch on window focus for real-time feel
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
          },
          mutations: {
            // Retry mutations 1 time
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
