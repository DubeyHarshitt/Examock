// src/pages/admin/content/TestsPage.tsx
// /admin/content/tests — every test, filterable (ticket 05 / design §5.2).

import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import { TestsTable } from "../../../components/admin/TestsTable";

export default function TestsPage() {
  return (
    <AdminLayout
      title="Tests"
      subtitle="Every test — filter by exam, subject, access, status or title"
    >
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: "Content" }, { label: "Tests" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Filtering and pagination are server-side. Scope chips are derived from{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-bold text-slate-600">
              subjectId
            </code>{" "}
            — no special field.
          </p>
          <Link
            to="/admin/content/tests/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Plus size={14} /> New test
          </Link>
        </div>

        <TestsTable filters />
      </div>
    </AdminLayout>
  );
}