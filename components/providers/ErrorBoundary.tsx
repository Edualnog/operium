"use client"

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Send error to analytics API
    this.trackError(error, errorInfo)
  }

  private async trackError(error: Error, errorInfo: ErrorInfo) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            event_name: 'ERROR_BOUNDARY_TRIGGERED',
            props: {
              error_type: 'boundary',
              error_message: error.message,
              error_stack: error.stack?.slice(0, 1000), // Limit stack size
              component_stack: errorInfo.componentStack?.slice(0, 500),
            },
            timestamp: new Date().toISOString(),
          }],
        }),
      })
    } catch {
      // Silently fail - don't cause more errors
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Algo deu errado
            </h2>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleReset}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Recarregar página
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">
                  Detalhes do erro (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-auto max-h-48">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
