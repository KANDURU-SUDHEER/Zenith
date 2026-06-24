"use client";

import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { X, CheckCircle2, AlertTriangle, Info, XCircle, Loader2, MapPin, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = "info" | "success" | "error" | "warning" | "loading" | "location" | "download";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ─── Globals (callable outside React tree) ───────────────────────────────────

let globalShowToast: ToastContextValue["showToast"] | null = null;
let globalDismissToast: ((id: string) => void) | null = null;
let globalDismissAll: (() => void) | null = null;

export function showToast(message: string, type: ToastType = "info", duration = 4000) {
  globalShowToast?.(message, type, duration);
}

export function dismissToast(id: string) {
  globalDismissToast?.(id);
}

/** Dismiss every visible toast — call this before showing a "done" toast */
export function dismissAllToasts() {
  globalDismissAll?.();
}

// ─── Provider ────────────────────────────────────────────────────────────────

const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAll = useCallback(() => setToasts([]), []);

  useEffect(() => {
    globalShowToast   = addToast;
    globalDismissToast = removeToast;
    globalDismissAll  = removeAll;
    return () => {
      globalShowToast    = null;
      globalDismissToast = null;
      globalDismissAll   = null;
    };
  }, [addToast, removeToast, removeAll]);

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2 pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} index={index} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const TOAST_ICONS: Record<ToastType, React.ElementType> = {
  info:     Info,
  success:  CheckCircle2,
  error:    XCircle,
  warning:  AlertTriangle,
  loading:  Loader2,
  location: MapPin,
  download: Download,
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  index,
  onDismiss,
}: {
  toast: ToastMessage;
  index: number;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible]  = useState(false);
  // Separate refs for auto-dismiss timer and exit-animation timer so both
  // are always properly cancelled on unmount — fixes the nested-setTimeout
  // leak where the 200ms exit timer could fire after unmount.
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enter animation
  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss cleanup on unmount — cancel both timers
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (exitTimerRef.current)    clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Trigger exit animation then remove
  const startExit = useCallback(() => {
    if (isExiting) return; // already exiting
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => onDismiss(toast.id), 200);
  }, [isExiting, onDismiss, toast.id]);

  // Auto-dismiss — ALL toast types auto-dismiss after their duration.
  // "loading" toasts get a generous 30s cap so they never get permanently stuck.
  useEffect(() => {
    const duration = toast.type === "loading"
      ? Math.min(toast.duration ?? 30000, 30000)
      : (toast.duration ?? 4000);

    dismissTimerRef.current = setTimeout(startExit, duration);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [toast.type, toast.duration, toast.id, startExit]);

  const Icon = TOAST_ICONS[toast.type] as React.ComponentType<{ className?: string }>;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3",
        "rounded-2xl border border-white/10 bg-[#0d0e10]/90 backdrop-blur-xl",
        "px-4 py-3 shadow-xl shadow-black/50",
        "min-w-[260px] max-w-[360px]",
        "transition-all duration-200 ease-out",
        isVisible && !isExiting
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
      )}
      style={{ transitionDelay: `${index * 20}ms` }}
      role="alert"
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 text-white/60",
          toast.type === "loading" ? "animate-spin" : ""
        )}
      />

      <p className="flex-1 text-[13px] font-medium leading-snug text-white/90 tracking-tight">
        {toast.message}
      </p>

      {/* ✕ button on every toast type — no more stuck toasts */}
      <button
        onClick={startExit}
        className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-white/8 hover:text-white/60"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
