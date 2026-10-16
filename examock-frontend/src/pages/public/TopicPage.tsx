// src/pages/public/TopicPage.tsx — `/exams/:examSlug/:subjectSlug/:topicSlug`
// (ticket 24): the chapter page. Thin by design (the growth plan flagged this
// — content volume arrives with ticket 32's content run), so it carries honest
// data-driven copy (real question counts) plus sibling links, never filler.
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicTopicApi } from "../../api/public.api";
import { useSeo } from "../../hooks/useSeo";
import Spinner from "../../components/ui/Spinner";

export default function TopicPage() {
  const { examSlug = "", subjectSlug = "", topicSlug = "" } = useParams();
  const { pathname } = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public", "topic", examSlug, subjectSlug, topicSlug],
    queryFn: () => getPublicTopicApi(examSlug, subjectSlug, topicSlug),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  useSeo({
    title: data
      ? `${data.current.name} — ${data.exam.name} ${data.subject.name} syllabus | Examock`
      : `${topicSlug} | Examock`,
    description: data
      ? `${data.current.name} in the ${data.exam.name} ${data.subject.name} syllabus: ${data.current.questionCount} practice question${data.current.questionCount === 1 ? "" : "s"} with worked explanations, mock tests and AI answers.`
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
          That chapter doesn't exist (or is no longer available).{" "}
          <Link to="/exams" className="text-brand-600 hover:underline">
            Browse all exams →
          </Link>
        </p>
      </main>
    );
  }

  const { exam, subject, current, siblings } = data;
  const others = siblings.filter((t) => t.slug !== current.slug);

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
            <li>
              <Link
                to={`/exams/${exam.slug}/${subject.slug}`}
                className="hover:text-slate-700"
              >
                {subject.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-600">{current.name}</li>
          </ol>
        </nav>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {current.name}
          <span className="text-brand-600">
            {" "}
            — {exam.name} {subject.name}
          </span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          {current.name} is part of the {exam.name} {subject.name} syllabus. It
          has {current.questionCount} practice question
          {current.questionCount === 1 ? "" : "s"} ready to solve, each with a
          worked explanation, plus timed mock tests for the full subject.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/free-questions"
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
          >
            Try free questions
          </Link>
          <Link
            to={`/exams/${exam.slug}/${subject.slug}`}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            All {subject.name} chapters
          </Link>
        </div>
      </div>

      {others.length > 0 && (
        <nav aria-label="Related chapters" className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            More chapters in {subject.name}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((topic) => (
              <li key={topic.slug}>
                <Link
                  to={`/exams/${exam.slug}/${subject.slug}/${topic.slug}`}
                  className="block rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </main>
  );
}
