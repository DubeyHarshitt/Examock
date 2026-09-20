// src/components/ui/FilterTabs.tsx
// Pill-style filter tabs (e.g. All / Chapter / Module / Full).

import { cn } from "../../utils/cn";

export interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterTabs({ tabs, value, onChange, className }: FilterTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/80 border border-slate-200 p-1",
        className
      )}
      role="tablist"
      aria-label="Filters"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default FilterTabs;