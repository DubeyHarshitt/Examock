// src/pages/public/FreeQuestionsPage.tsx — `/free-questions` (ticket 24):
// the public sample-questions page.
//
// Content source: the shipped sample CSV (`public/samples/sample-questions.csv`)
// imported at build time with `?raw` — no API call, no auth, and deliberately
// NOT the live question API (correctOption never leaves the authenticated
// stack; this file is already public static content).
//
// The CSV's 4th row intentionally ships with no `correctOption` (pinned by
// backend test/sampleImports.test.js) — the UI handles it as "answer not
// published" instead of inventing one.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import sampleCsv from "../../../public/samples/sample-questions.csv?raw";
import { csvToObjects } from "../../utils/csv";
import { track } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";

interface SampleQuestion {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
}

const OPTIONS = ["A", "B", "C", "D"] as const;
const LETTER_TO_KEY: Record<(typeof OPTIONS)[number], keyof SampleQuestion> = {
  A: "optionA",
  B: "optionB",
  C: "optionC",
  D: "optionD",
};

export default function FreeQuestionsPage() {
  useSeo({
    title: "Free practice questions with answers — JEE, NEET & MHT-CET sample | Examock",
    description:
      "Solve real sample questions for free — with worked explanations the moment you answer. No signup needed. Covers physics and chemistry questions from JEE, NEET and MHT-CET syllabuses.",
    path: "/free-questions",
  });

  const questions = useMemo<SampleQuestion[]>(() =>
    csvToObjects(sampleCsv).map((row) => ({
      text: row.text ?? "",
      optionA: row.optionA ?? "",
      optionB: row.optionB ?? "",
      optionC: row.optionC ?? "",
      optionD: row.optionD ?? "",
      correctOption: (row.correctOption ?? "").trim(),
      explanation: row.explanation ?? "",
    })), []);

  // Picks keyed by question index → chosen letter, or null while unanswered.
  const [picks, setPicks] = useState<Record<number, string | null>>({});

  const pick = (index: number, letter: string) => {
    setPicks((prev) => (index in prev ? prev : { ...prev, [index]: letter }));
  };

  const reset = () => setPicks({});

  const answeredCount = Object.keys(picks).length;

  const onCta = () => {
    track("cta_click", { cta: "try_free", location: "free_questions" });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-16">
      <div className="max-w-2xl py-8 animate-rise">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          No signup needed
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Try these <span className="text-brand-600">free questions.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Four sample questions with instant, worked explanations — the same
          style you get inside a full mock test. Pick an answer to reveal how
          it's solved.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q, i) => {
          const picked = picks[i] ?? null;
          const revealed = picked !== null;
          const keyed = q.correctOption !== "";
          const isCorrect = keyed && picked === q.correctOption;

          return (
            <article
              key={i}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Question {i + 1}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  MCQ
                </span>
              </div>

              <p className="mt-3 font-medium leading-relaxed text-slate-900">
                {q.text}
              </p>

              <div className="mt-4 grid gap-2.5">
                {OPTIONS.map((letter) => {
                  const label = q[LETTER_TO_KEY[letter]];
                  const chosen = picked === letter;
                  const correct = keyed && q.correctOption === letter;

                  let state =
                    "border-slate-200 bg-white text-slate-700 hover:border-brand-300";
                  if (revealed && correct) {
                    state = "border-emerald-300 bg-emerald-50 text-emerald-800";
                  } else if (revealed && chosen && keyed) {
                    state = "border-rose-300 bg-rose-50 text-rose-800";
                  } else if (revealed) {
                    state = "border-slate-100 bg-slate-50 text-slate-400";
                  }

                  return (
                    <button
                      key={letter}
                      onClick={() => pick(i, letter)}
                      disabled={revealed}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${state} ${
                        revealed ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                        {letter}
                      </span>
                      <span>{label}</span>
                      {revealed && correct && (
                        <span className="ml-auto text-xs font-semibold">
                          ✓ Correct
                        </span>
                      )}
                      {revealed && chosen && !correct && keyed && (
                        <span className="ml-auto text-xs font-semibold">
                          ✗ Your pick
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  {keyed ? (
                    <p className="font-medium text-slate-900">
                      {isCorrect ? "Correct! " : `Answer: ${q.correctOption}. `}
                      <span className="font-normal text-slate-600">
                        {q.explanation}
                      </span>
                    </p>
                  ) : (
                    <>
                      <p className="font-medium text-slate-500">
                        Answer not published for this sample — here's the
                        explanation:
                      </p>
                      <p className="mt-1">{q.explanation}</p>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {answeredCount > 0 && (
        <button
          onClick={reset}
          className="mt-6 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          Reset answers ({answeredCount}/{questions.length} answered)
        </button>
      )}

      <section className="mt-12 rounded-2xl border border-slate-100 bg-surface p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Want the full paper?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Download the complete sample paper, or sign up free to take it as a
          timed mock test with instant results and topic-wise analysis.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            onClick={onCta}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
          >
            Take it as a timed test
          </Link>
          <a
            href="/samples/sample-question-paper.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            Download PDF ↓
          </a>
        </div>
      </section>
    </main>
  );
}
