// src/components/ui/Sparkline.tsx
// Tiny client-side SVG line chart (last-N attempts) — no chart library needed.

import { useId } from "react";

interface SparklineProps {
  /** Values to plot (e.g. attempt percentages). */
  points: number[];
  width?: number;
  height?: number;
  /** Stroke + area color (hex). */
  color?: string;
  className?: string;
}

export function Sparkline({
  points,
  width = 140,
  height = 36,
  color = "#6366f1",
  className,
}: SparklineProps) {
  const gradId = useId().replace(/:/g, "");

  if (points.length < 2) {
    return <div className={className} style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;

  const stepX = (width - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((p - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="2.8" fill={color} />
    </svg>
  );
}

export default Sparkline;