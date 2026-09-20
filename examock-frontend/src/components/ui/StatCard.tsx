// src/components/ui/StatCard.tsx
// Row-style stat card with a gradient icon tile and a count-up value.

import { useCountUp } from "../../hooks/useMotion";
import { cn } from "../../utils/cn";
import { Reveal } from "./Reveal";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Gradient/background classes for the icon tile, e.g. "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white" */
  tile?: string;
  /** Optional suffix shown with the number (e.g. "%") */
  suffix?: string;
  /** Optional custom formatter for the raw number */
  format?: (n: number) => string;
  delay?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tile = "bg-gradient-to-br from-brand-500 to-brand-600 text-white",
  suffix = "",
  format,
  delay = 0,
  className,
}: StatCardProps) {
  const animated = useCountUp(value);
  const display =
    format != null ? format(animated) : `${Math.round(animated)}${suffix}`;

  return (
    <Reveal delay={delay} className={className}>
      <div className="card-surface card-surface-hover flex items-center gap-3 p-4">
        <div
          className={cn(
            "w-11 h-11 shrink-0 rounded-xl flex items-center justify-center shadow-sm",
            tile
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight">
            {display}
          </p>
          <p className="text-xs text-slate-500 truncate">{label}</p>
        </div>
      </div>
    </Reveal>
  );
}

export default StatCard;