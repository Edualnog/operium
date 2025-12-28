"use client"

import { useEffect, createContext, useContext, type ReactNode } from 'react'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { ErrorBoundary } from './ErrorBoundary'

// ============================================================================
// CONTEXT
// ============================================================================

type AnalyticsContextType = ReturnType<typeof useAnalytics>

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const analytics = useAnalytics()

  // Global error tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      analytics.trackError({
        error_type: 'js_error',
        error_message: event.message,
        error_stack: event.error?.stack,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError({
        error_type: 'js_error',
        error_message: event.reason?.message || 'Unhandled Promise Rejection',
        error_stack: event.reason?.stack,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [analytics])

  return (
    <AnalyticsContext.Provider value={analytics}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </AnalyticsContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider')
  }
  return context
}
