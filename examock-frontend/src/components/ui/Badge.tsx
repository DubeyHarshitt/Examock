// src/components/ui/Badge.tsx
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  muted: "bg-gray-50 text-gray-500 border border-gray-200",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
