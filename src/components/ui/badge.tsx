import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "cosmic" | "nebula" | "success" | "warning";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-glass-cream border-border-subtle text-cream-300",
  cosmic: "bg-cherry-900/20 border-cherry-500/30 text-cherry-300 ring-1 ring-cherry-500/10",
  nebula: "bg-cherry-900/20 border-cherry-400/30 text-cherry-200 ring-1 ring-cherry-400/10",
  success: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/15 border-amber-400/30 text-amber-300 ring-1 ring-amber-500/20",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
