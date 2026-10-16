// src/pages/public/ExamsListPage.tsx — `/exams` (ticket 24): the crawlable
// index of every exam's syllabus. Entry point of the public link graph:
// / → /exams → /exams/:exam → /exams/:exam/:subject → .../:topic.
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicExamsApi } from "../../api/public.api";
import { useSeo } from "../../hooks/useSeo";
import Spinner from "../../components/ui/Spinner";

export default function ExamsListPage() {
  useSeo({
    title: "Exam syllabus — JEE, NEET & MHT-CET chapters | Examock",
    description:
      "Browse the full syllabus for JEE, NEET and MHT-CET — subject and chapter lists with free mock tests, practice questions and AI answers that cite the source.",
    path: "/exams",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public", "exam-types"],
    queryFn: getPublicExamsApi,
    staleTime: 1000 * 60 * 10,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <div className="max-w-3xl py-8 animate-rise">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Syllabus for every exam
          <span className="text-brand-600"> we cover.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Open an exam to see its subjects and chapters. Each chapter links to
          practice questions, mock tests and AI answers drawn only from your
          exam's own material — no generic chatbot guesswork.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-slate-100 bg-surface p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Could not load the syllabus right now.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Please refresh the page — or{" "}
            <Link to="/login" className="text-brand-600 hover:underline">
              sign in
            </Link>{" "}
            to start practicing.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((exam) => (
            <Link
              key={exam.slug}
              to={`/exams/${exam.slug}`}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
            >
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-700">
                {exam.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {exam.subjectCount} subject{exam.subjectCount === 1 ? "" : "s"}{" "}
                · {exam.topicCount} chapter{exam.topicCount === 1 ? "" : "s"}
              </p>
              {exam.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">
                  {exam.description}
                </p>
              )}
              <ul className="mt-4 flex flex-wrap gap-2">
                {exam.subjects.map((subject) => (
                  <li
                    key={subject.slug}
                    className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                  >
                    {subject.name}
                  </li>
                ))}
              </ul>
              <span className="mt-5 inline-block text-sm font-semibold text-brand-600">
                View syllabus →
              </span>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-14 rounded-2xl border border-slate-100 bg-surface p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Read enough — start practicing.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Timed mock tests with instant results, and AI answers that cite the
          page they came from. Free to start.
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
