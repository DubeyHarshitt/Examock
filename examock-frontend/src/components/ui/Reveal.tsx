// src/components/ui/Reveal.tsx
// Staggered mount animation wrapper. Content is always in the DOM (no
// layout shift on disabled motion) — the animation only fades/slides it in.

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface RevealProps {
  children: ReactNode;
  /** Animation delay in ms — use to stagger grids/lists. */
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const style: CSSProperties | undefined = delay ? { animationDelay: `${delay}ms` } : undefined;
  return (
    <div className={cn("animate-rise", className)} style={style}>
      {children}
    </div>
  );
}

export default Reveal;