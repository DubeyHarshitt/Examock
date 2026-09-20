// src/components/ui/EmptyState.tsx
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty-state placeholder for lists/tables with no data. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center px-6 py-12 overflow-hidden",
        className
      )}
    >
      {/* Soft ambient glow behind the icon */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(240px_120px_at_50%_0%,rgb(99_102_241/0.08),transparent_70%)]"
      />
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-card flex items-center justify-center text-white">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;