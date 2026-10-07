// src/pages/admin/content/ExamDetailPage.tsx
// /admin/content/exams/:examId — exam → subjects + whole-exam tests (design §5).

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GraduationCap, ListChecks, Plus, BookOpen } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import { TestsTable } from "../../../components/admin/TestsTable";
import { getExamDetailApi } from "../../../api/admin.api";
import type { ExamDetail } from "../../../store/admin/types/admin.types";

export default function ExamDetailPage() {
  const { examId = "" } = useParams();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const load = useCallback(() => {
    getExamDetailApi(examId)
      .then((data) => {
        setExam(data);
        setLoadedFor(examId);
        setError(null);
      })
      .catch(() => setError("Could not load exam"));
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  // `ready` guards against showing the previous exam while the next one loads
  // (the component instance survives param changes).
  const ready = loadedFor === examId;
  const loading = !ready && !error;

  return (
    <AdminLayout title={exam?.name ?? "Exam"} subtitle={exam?.description ?? undefined}>
      <div className="space-y-6">
        <Breadcrumbs
          crumbs={[
            { label: "Content", to: "/admin/content/exams" },
            { label: "Exams", to: "/admin/content/exams" },
            { label: exam?.name ?? "…" },
          ]}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="card-surface flex items-center justify-center py-16 text-xs font-medium text-slate-400">
            Loading exam…
          </div>
        )}

        {ready && exam && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {exam.subjects.length} active subject
                {exam.subjects.length !== 1 ? "s" : ""} ·{" "}
                <span className="font-bold text-slate-700">
                  {exam.wholeExamTestCount} whole-exam test
                  {exam.wholeExamTestCount !== 1 ? "s" : ""}
                </span>
              </p>
              <Link
                to={`/admin/content/tests/new?examId=${exam.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                <Plus size={14} /> New whole-exam test
              </Link>
            </div>

            {/* Whole-exam tests — the exam-wide table, pre-filtered (scope=exam) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ListChecks size={15} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900">Whole-exam tests</h2>
              </div>
              <TestsTable examTypeId={exam.id} subjectId={null} scope="exam" onChanged={load} />
            </section>

            {/* Subjects */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900">Subjects</h2>
              </div>
              {exam.subjects.length === 0 ? (
                <div className="card-surface flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap size={28} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No subjects yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Add subjects from the legacy builder's subject manager.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {exam.subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      to={`/admin/content/exams/${exam.id}/subjects/${subject.id}`}
                      className="card-surface group flex items-center gap-3 p-4 transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-600/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <GraduationCap size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {subject.name}
                        </p>
                        <p className="text-xs font-medium text-slate-400">
                          {subject._count.mockTests} test
                          {subject._count.mockTests !== 1 ? "s" : ""} ·{" "}
                          {subject._count.topics} chapter
                          {subject._count.topics !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}