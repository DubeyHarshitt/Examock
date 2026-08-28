// src/components/ui/Skeleton.tsx
import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
}

/** Animated placeholder block for loading states. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />
  );
}

interface SkeletonCardProps {
  className?: string;
}

/** Full card-shaped skeleton, useful for grids/lists of data. */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-5 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="pt-2">
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default Skeleton;
