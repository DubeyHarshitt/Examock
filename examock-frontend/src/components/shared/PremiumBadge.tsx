// src/components/shared/PremiumBadge.tsx
//
// Non-interactive badge used in place of the misleading "Unlock" button on
// paid tests. There is no payment module on the student side yet; the badge
// tells the truth — "this is a premium test" — without promising an action
// that doesn't exist.
//
// See: docs/student-pannel/issue-01/ticket/05-paid-test-badge.md

import { Lock } from "lucide-react";
import { cn } from "../../utils/cn";

interface PremiumBadgeProps {
  /** Optional size variant. Default = md. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE: Record<NonNullable<PremiumBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

const ICON: Record<NonNullable<PremiumBadgeProps["size"]>, string> = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

export function PremiumBadge({ size = "md", className }: PremiumBadgeProps) {
  return (
    <span
      aria-label="Premium test"
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
        "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        SIZE[size],
        className,
      )}
    >
      <Lock className={ICON[size]} aria-hidden="true" />
      Premium
    </span>
  );
}

export default PremiumBadge;