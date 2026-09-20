// src/utils/subjectColor.ts
// Deterministic color-coding for subjects. Every subject gets one of 8 hues
// (stable per name), so its color follows it through subjects, topics,
// progress and tests. All class strings are full literals so Tailwind's
// scanner picks them up.

export interface SubjectHue {
  /** Small solid dot (list rows, chips) */
  dot: string;
  /** Soft background + strong text (chips, badges) */
  soft: string;
  /** Gradient tile with white icon */
  tile: string;
  /** Progress-bar fill */
  bar: string;
  /** Text accent */
  text: string;
  /** Interactive hover border */
  hoverBorder: string;
}

const HUES: SubjectHue[] = [
  {
    dot: "bg-indigo-500",
    soft: "bg-indigo-50 text-indigo-700",
    tile: "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white",
    bar: "bg-indigo-500",
    text: "text-indigo-600",
    hoverBorder: "hover:border-indigo-300",
  },
  {
    dot: "bg-violet-500",
    soft: "bg-violet-50 text-violet-700",
    tile: "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
    bar: "bg-violet-500",
    text: "text-violet-600",
    hoverBorder: "hover:border-violet-300",
  },
  {
    dot: "bg-sky-500",
    soft: "bg-sky-50 text-sky-700",
    tile: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    bar: "bg-sky-500",
    text: "text-sky-600",
    hoverBorder: "hover:border-sky-300",
  },
  {
    dot: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
    tile: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    hoverBorder: "hover:border-emerald-300",
  },
  {
    dot: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700",
    tile: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    bar: "bg-amber-500",
    text: "text-amber-600",
    hoverBorder: "hover:border-amber-300",
  },
  {
    dot: "bg-rose-500",
    soft: "bg-rose-50 text-rose-700",
    tile: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
    bar: "bg-rose-500",
    text: "text-rose-600",
    hoverBorder: "hover:border-rose-300",
  },
  {
    dot: "bg-teal-500",
    soft: "bg-teal-50 text-teal-700",
    tile: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white",
    bar: "bg-teal-500",
    text: "text-teal-600",
    hoverBorder: "hover:border-teal-300",
  },
  {
    dot: "bg-fuchsia-500",
    soft: "bg-fuchsia-50 text-fuchsia-700",
    tile: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white",
    bar: "bg-fuchsia-500",
    text: "text-fuchsia-600",
    hoverBorder: "hover:border-fuchsia-300",
  },
];

/** Pick a stable hue for a subject based on its name. */
export function subjectHue(name: string): SubjectHue {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length];
}