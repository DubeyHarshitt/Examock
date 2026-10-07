// src/pages/admin/content/SubjectDetailPage.tsx
// /admin/content/exams/:examId/subjects/:subjectId — subject → chapters + tests
// in this subject (design §5).

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FolderOpen, Layers, Plus } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import { TestsTable } from "../../../components/admin/TestsTable";
import { getExamDetailApi, getTopicsApi } from "../../../api/admin.api";
import type { Topic } from "../../../store/admin/types/admin.types";

export default function SubjectDetailPage() {
  const { examId = "", subjectId = "" } = useParams();

  const [examName, setExamName] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const load = useCallback(() => {
    const key = `${examId}:${subjectId}`;
    Promise.all([getExamDetailApi(examId), getTopicsApi(subjectId)])
      .then(([exam, topicList]) => {
        setExamName(exam.name);
        const subject = exam.subjects.find((s) => s.id === subjectId);
        setSubjectName(subject?.name ?? "Subject");
        setTopics(topicList ?? []);
        setLoadedKey(key);
        setError(null);
      })
      .catch(() => setError("Could not load subject"));
  }, [examId, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Guards against stale data while navigating between subjects.
  const ready = loadedKey === `${examId}:${subjectId}`;
  const loading = !ready && !error;

  return (
    <AdminLayout title={subjectName ?? "Subject"} subtitle={examName ? `in ${examName}` : undefined}>
      <div className="space-y-6">
        <Breadcrumbs
          crumbs={[
            { label: "Content", to: "/admin/content/exams" },
            { label: "Exams", to: "/admin/content/exams" },
            examName ? { label: examName, to: `/admin/content/exams/${examId}` } : { label: "…" },
            { label: subjectName ?? "…" },
          ]}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="card-surface flex items-center justify-center py-16 text-xs font-medium text-slate-400">
            Loading subject…
          </div>
        )}

        {ready && examName && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                <Link
                  to={`/admin/content/exams/${examId}`}
                  className="font-bold text-brand-600 hover:underline"
                >
                  {examName}
                </Link>{" "}
                ›{" "}
                <span className="font-bold text-slate-700">
                  {topics.length} chapter{topics.length !== 1 ? "s" : ""}
                </span>
              </p>
              <Link
                to={`/admin/content/tests/new?examId=${examId}&subjectId=${subjectId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                <Plus size={14} /> New test in this subject
              </Link>
            </div>

            {/* Tests in this subject — pre-filtered */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderOpen size={15} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900">Tests</h2>
              </div>
              <TestsTable examTypeId={examId} subjectId={subjectId} onChanged={load} />
            </section>

            {/* Chapters */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900">Chapters</h2>
              </div>
              {topics.length === 0 ? (
                <div className="card-surface flex flex-col items-center justify-center py-10 text-center">
                  <Layers size={26} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No chapters yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Chapters are managed from the legacy builder's chapter manager.
                  </p>
                </div>
              ) : (
                <div className="card-surface overflow-hidden">
                  <ul className="divide-y divide-slate-50">
                    {topics.map((topic) => (
                      <li
                        key={topic.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800"
                      >
                        <Layers size={14} className="shrink-0 text-slate-300" />
                        {topic.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}