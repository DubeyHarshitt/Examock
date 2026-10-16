// src/pages/public/SyllabusPage.tsx — `/exams/:examSlug` (ticket 24):
// the exam's full syllabus — subjects with their chapters, all crawlable
// links down to chapter pages.
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicSyllabusApi } from "../../api/public.api";
import { useSeo } from "../../hooks/useSeo";
import Spinner from "../../components/ui/Spinner";

function Breadcrumbs({ examName }: { examName?: string }) {
  return (
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
        {examName && (
          <>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-slate-600">{examName}</li>
          </>
        )}
      </ol>
    </nav>
  );
}

export default function SyllabusPage() {
  const { examSlug = "" } = useParams();
  const { pathname } = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public", "syllabus", examSlug],
    queryFn: () => getPublicSyllabusApi(examSlug),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  useSeo({
    title: data
      ? `${data.name} syllabus — subjects & chapters | Examock`
      : `${examSlug} syllabus | Examock`,
    description: data
      ? `Full ${data.name} syllabus: ${data.subjects.length} subject${data.subjects.length === 1 ? "" : "s"} with every chapter, linked to mock tests, practice questions and AI answers.`
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
          That exam doesn't exist (or is no longer available).{" "}
          <Link to="/exams" className="text-brand-600 hover:underline">
            Browse all exams →
          </Link>
        </p>
      </main>
    );
  }

  const topicCount = data.subjects.reduce((n, s) => n + s.topics.length, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <div className="max-w-3xl pt-8">
        <Breadcrumbs examName={data.name} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {data.name} <span className="text-brand-600">syllabus</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          {data.description ||
            `Everything in the ${data.name} syllabus — ${data.subjects.length} subject${data.subjects.length === 1 ? "" : "s"}, ${topicCount} chapter${topicCount === 1 ? "" : "s"}, each with practice questions and mock tests.`}
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {data.subjects.map((subject) => (
          <section
            key={subject.slug}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                <Link
                  to={`/exams/${data.slug}/${subject.slug}`}
                  className="transition hover:text-brand-700"
                >
                  {subject.name}
                </Link>
              </h2>
              <span className="text-xs font-medium text-slate-400">
                {subject.topics.length} chapter
                {subject.topics.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {subject.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    to={`/exams/${data.slug}/${subject.slug}/${topic.slug}`}
                    className="block rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {topic.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to={`/exams/${data.slug}/${subject.slug}`}
              className="mt-5 inline-block text-sm font-semibold text-brand-600"
            >
              Open {subject.name} →
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
