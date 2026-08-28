// src/components/ui/Card.tsx
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Optional header area rendered above the body */
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Reusable white card container matching the app's design language. */
export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
        className
      )}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export default Card;
