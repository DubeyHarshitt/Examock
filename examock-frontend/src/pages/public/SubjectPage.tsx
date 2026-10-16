// src/pages/public/SubjectPage.tsx — `/exams/:examSlug/:subjectSlug`
// (ticket 24): one subject with its chapter list (question counts) and
// cross-links to sibling subjects for crawl depth.
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicSubjectApi } from "../../api/public.api";
import { useSeo } from "../../hooks/useSeo";
import Spinner from "../../components/ui/Spinner";

export default function SubjectPage() {
  const { examSlug = "", subjectSlug = "" } = useParams();
  const { pathname } = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public", "subject", examSlug, subjectSlug],
    queryFn: () => getPublicSubjectApi(examSlug, subjectSlug),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  useSeo({
    title: data
      ? `${data.exam.name} ${data.subject.name} — chapters & practice | Examock`
      : `${subjectSlug} | Examock`,
    description: data
      ? `${data.subject.name} syllabus for ${data.exam.name}: ${data.subject.topics.length} chapter${data.subject.topics.length === 1 ? "" : "s"} with practice questions, mock tests and AI answers.`
      : undefined,
    path: pathname,
  });

  if (isLoading) {
    return (
      <main className="flex justify-center py-24">
        <Spinner />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          That subject doesn't exist under this exam.{" "}
          <Link to="/exams" className="text-brand-600 hover:underline">
            Browse all exams →
          </Link>
        </p>
      </main>
    );
  }

  const { exam, subject, siblings } = data;
  const totalQuestions = subject.topics.reduce(
    (n, t) => n + t.questionCount,
    0,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <div className="max-w-3xl pt-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-slate-700">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/exams" className="hover:text-slate-700">
                Syllabus
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/exams/${exam.slug}`} className="hover:text-slate-700">
                {exam.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-600">{subject.name}</li>
          </ol>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {subject.name}{" "}
          <span className="text-brand-600">— {exam.name}</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          {subject.topics.length} chapter{subject.topics.length === 1 ? "" : "s"}{" "}
          in the {exam.name} {subject.name} syllabus, with {totalQuestions}{" "}
          practice question{totalQuestions === 1 ? "" : "s"} ready to solve —
          each with a worked explanation.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Chapters in {subject.name}
        </h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {subject.topics.map((topic) => (
            <li key={topic.slug}>
              <Link
                to={`/exams/${exam.slug}/${subject.slug}/${topic.slug}`}
                className="flex items-center justify-between gap-4 py-3.5 transition hover:text-brand-700"
              >
                <span className="font-medium text-slate-800">
                  {topic.name}
                </span>
                <span className="shrink-0 text-sm text-slate-400">
                  {topic.questionCount} question
                  {topic.questionCount === 1 ? "" : "s"} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {siblings.length > 1 && (
        <nav aria-label="Related subjects" className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            More {exam.name} subjects
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings
              .filter((s) => s.slug !== subject.slug)
              .map((s) => (
                <li key={s.slug}>
                  <Link
                    to={`/exams/${exam.slug}/${s.slug}`}
                    className="block rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      )}

      <section className="mt-12 rounded-2xl border border-slate-100 bg-surface p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Ready to test {subject.name}?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Timed {exam.name} mock tests with instant results — and AI answers
          that cite the note they came from.
        </p>
        <Link
          to="/free-questions"
          className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          Try free questions
        </Link>
      </section>
    </main>
  );
}
