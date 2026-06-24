"use client";

import { cn } from "@/lib/utils";
import { useApiStatus } from "@/hooks/use-api-status";
import { LastUpdated } from "./LastUpdated";
import { RefreshCw, Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ServiceHealth, ServiceStatus } from "@/services/api-health";

interface ApiStatusPanelProps {
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<ServiceStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: "text-green-400", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "text-amber-400", label: "Warning" },
  offline: { icon: XCircle, color: "text-red-400", label: "Offline" },
};

/**
 * API Status Panel — displays health of all services.
 * Shows status, response time, and last updated for each service.
 */
export function ApiStatusPanel({ className, compact = false }: ApiStatusPanelProps) {
  const { services, summary, isLoading, lastChecked, refetch } = useApiStatus();

  const serviceList = Array.from(services.values());

  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface-primary",
        className
      )}
      role="region"
      aria-label="API Status Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cosmic-400" />
          <h3 className="text-sm font-medium text-star-white">API Status</h3>
          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] text-star-white/50">
            {summary.healthy}/{summary.total} Healthy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LastUpdated timestamp={lastChecked} prefix="" className="text-star-white/30" />
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="rounded-md p-1.5 text-star-white/40 hover:bg-surface-glass hover:text-star-white disabled:opacity-50"
            aria-label="Refresh API status"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Services List */}
      <div className={cn("divide-y divide-border-subtle", compact && "max-h-64 overflow-y-auto")}>
        {isLoading && serviceList.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-star-white/30">
            Checking services...
          </div>
        ) : (
          serviceList.map((service) => (
            <ServiceRow key={service.id} service={service} compact={compact} />
          ))
        )}
      </div>

      {/* Footer Summary */}
      {!compact && (
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2">
          <div className="flex items-center gap-3">
            {summary.healthy > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {summary.healthy} healthy
              </span>
            )}
            {summary.warning > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {summary.warning} warning
              </span>
            )}
            {summary.offline > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {summary.offline} offline
              </span>
            )}
          </div>
          <span className="text-[10px] text-star-white/25">
            Checks every 30s
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Service Row ─────────────────────────────────────────────────────────────

function ServiceRow({ service, compact }: { service: ServiceHealth; compact: boolean }) {
  const config = STATUS_CONFIG[service.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
        <div>
          <span className="text-xs font-medium text-star-white/80">
            {service.name}
          </span>
          {service.message && !compact && (
            <p className="text-[10px] text-star-white/30">{service.message}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Response time */}
        <span
          className={cn(
            "font-mono text-[10px]",
            service.responseTime < 500 && "text-green-400/60",
            service.responseTime >= 500 && service.responseTime < 2000 && "text-amber-400/60",
            service.responseTime >= 2000 && "text-red-400/60"
          )}
        >
          {service.responseTime > 0 ? `${service.responseTime}ms` : "—"}
        </span>
        {/* Status label */}
        <span className={cn("text-[10px] font-medium", config.color)}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
