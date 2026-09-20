// src/components/ui/ProgressRing.tsx
// Animated SVG progress ring with a brand gradient stroke.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ProgressRingProps {
  /** 0..100 */
  value: number;
  size?: number;
  stroke?: number;
  /** Optional center content (label, big number…) */
  children?: ReactNode;
  className?: string;
  /** Gradient stops, defaults to the brand indigo scale. */
  from?: string;
  to?: string;
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  children,
  className,
  from = "#6366f1",
  to = "#4538d6",
}: ProgressRingProps) {
  const gradId = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  // Animate from "empty" to target so the ring sweeps in on mount.
  const [offset, setOffset] = useState(c);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Let the first paint happen, then sweep to the final value.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setOffset(c - (pct / 100) * c))
      );
    } else {
      setOffset(c - (pct / 100) * c);
    }
  }, [c, pct]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(pct)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: from }} />
            <stop offset="100%" style={{ stopColor: to }} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ stroke: `url(#ring-${gradId})`, transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export default ProgressRing;