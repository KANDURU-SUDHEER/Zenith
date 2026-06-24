"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Name of the module for error display */
  module?: string;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Called when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/** True when the error is a webpack/Next.js chunk load failure */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message + (error.name || "");
  return (
    msg.includes("Loading chunk") ||
    msg.includes("Failed to load chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("dynamic import") ||
    msg.includes("Importing a module script failed") ||
    error.name === "ChunkLoadError"
  );
}

/**
 * Reusable Error Boundary — isolates failures per module.
 * One module crashing will NOT take down the entire application.
 *
 * Retry behaviour:
 * - Chunk load errors → full page reload (the only real fix for a failed chunk)
 * - All other errors  → reset boundary state and re-render the child
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.module || "unknown"}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    // Chunk load errors can only be fixed by a full reload — the failed
    // module is permanently broken in the current JS session.
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }

    // For all other errors: reset the boundary and re-render the child.
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const chunkError = isChunkLoadError(this.state.error);

      return (
        <div className="flex h-full min-h-[200px] w-full items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-star-white/80">
                {this.props.module || "Module"} encountered an error
              </h3>
              <p className="mt-1 text-xs text-star-white/40">
                {chunkError
                  ? "A resource failed to load. This is usually a temporary network issue."
                  : (this.state.error?.message || "An unexpected error occurred")}
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-lg bg-surface-glass px-4 py-2 text-xs font-medium text-star-white/70 hover:bg-surface-secondary hover:text-star-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {chunkError ? "Reload page" : "Retry"}
            </button>
            {chunkError && (
              <p className="text-[10px] text-star-white/25">
                The page will reload automatically
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
