// src/pages/admin/content/ExamsPage.tsx
// /admin/content/exams — the exams tree entry point (ticket 05 / design §5).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, ListChecks, Plus } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import { getExamsApi } from "../../../api/admin.api";
import type { ExamNode } from "../../../store/admin/types/admin.types";

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExamsApi()
      .then(setExams)
      .catch(() => setError("Could not load exams"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Exams" subtitle="Exams tree — content lives under exams and subjects">
      <div className="space-y-6">
        <Breadcrumbs crumbs={[{ label: "Content" }, { label: "Exams" }]} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Pick an exam to see its subjects and tests, or jump straight to the{" "}
            <Link to="/admin/content/tests" className="font-bold text-brand-600 hover:underline">
              filterable tests list
            </Link>
            .
          </p>
          <Link
            to="/admin/content/tests/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Plus size={14} /> New test
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card-surface flex items-center justify-center py-16 text-xs font-medium text-slate-400">
            Loading exams…
          </div>
        ) : exams.length === 0 ? (
          <div className="card-surface flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap size={32} className="mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No active exams yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Create one from the legacy builder's "Exam types" tool.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                to={`/admin/content/exams/${exam.id}`}
                className="card-surface group flex flex-col gap-3 p-5 transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-600/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <GraduationCap size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-slate-900">{exam.name}</p>
                    <p className="truncate text-xs text-slate-400">/admin/content/exams — {exam.slug}</p>
                  </div>
                </div>
                {exam.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {exam.description}
                  </p>
                )}
                <div className="flex items-center gap-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-slate-400" />
                    {exam.subjectCount} subject{exam.subjectCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ListChecks size={13} className="text-slate-400" />
                    {exam.testCount} test{exam.testCount !== 1 ? "s" : ""}
                  </span>
                  <span className="ml-auto text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}