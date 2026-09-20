// src/components/ui/Chip.tsx
// Compact meta pill used to surface counts/durations without clutter.

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Chip({ children, icon, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export default Chip;