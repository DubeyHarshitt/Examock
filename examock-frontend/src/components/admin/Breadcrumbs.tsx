// src/components/admin/Breadcrumbs.tsx
// Content-tree breadcrumb trail: `Content / JEE / Physics / Kinematics Revision`
// (design §5 — every content screen carries its place in the tree).

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-400"
    >
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
            {crumb.to && !last ? (
              <Link
                to={crumb.to}
                className="text-slate-500 transition-colors hover:text-brand-600"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={last ? "text-slate-900" : "text-slate-500"}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}