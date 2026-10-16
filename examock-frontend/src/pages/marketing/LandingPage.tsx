import { Link, useNavigate } from "react-router-dom";
import { track } from "../../utils/analytics";

// Ticket 04: the public marketing page for logged-out visitors. Rendered at
// `/` by App.tsx's auth-aware HomeRoute.
//
// The primary CTA is "Try free". The guest/signup-free flow is ticket 19 and is
// not built yet, so for now the CTA routes to /login; when 19 lands, only this
// handler changes.
//
// Ticket 24: the nav/hero/footer also link into /exams and /free-questions so
// crawlers hitting `/` discover the public SEO pages without a sitemap.

const FEATURES = [
  {
    title: "Syllabus-grounded answers",
    body: "Ask any doubt and get an answer drawn only from your exam's notes and papers — never generic chatbot guesswork.",
  },
  {
    title: "Sources you can verify",
    body: "Every answer cites the note or paper it came from, so you can trust it and read further.",
  },
  {
    title: "Mock tests that find weak spots",
    body: "Timed, topic-wise, and full-syllabus tests with instant results and topic-wise weakness analysis.",
  },
  {
    title: "Track your progress",
    body: "See scores over time and the topics you have covered, all in one dashboard.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const onTryFree = () => {
    track("cta_click", { cta: "try_free", location: "hero" });
    navigate("/login");
  };

  const onSignIn = () => {
    track("cta_click", { cta: "sign_in", location: "nav" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-mark.svg"
            alt="Examock logo"
            className="h-9 w-9"
            draggable={false}
          />
          <span className="text-lg font-bold tracking-tight">Examock</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/exams"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Syllabus
          </Link>
          <Link
            to="/free-questions"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Free questions
          </Link>
          <button
            onClick={onSignIn}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center animate-rise">
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            AI answers that cite their source
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Ask any question from your syllabus.
            <span className="text-brand-600"> Get the answer with the source page.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Examock answers only from your exam's own material — and shows you
            exactly where the answer came from. Then test yourself with mock
            tests that target your weak topics.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onTryFree}
              className="w-full rounded-xl bg-brand-600 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-700 sm:w-auto"
            >
              Try free
            </button>
            <Link
              to="/exams"
              className="w-full rounded-xl border border-slate-200 px-7 py-3 text-center text-base font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 sm:w-auto"
            >
              Browse the syllabus
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">No card required</p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Prepare smarter, not harder.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Sign in with Google and start asking questions from your own syllabus.
        </p>
        <button
          onClick={onTryFree}
          className="mt-7 rounded-xl bg-brand-600 px-7 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          Try free
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Not ready?{" "}
          <Link to="/free-questions" className="font-medium text-brand-600 hover:underline">
            Solve free sample questions first
          </Link>{" "}
          — no signup needed.
        </p>
      </section>

      <footer className="border-t border-slate-100 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-400 sm:flex-row">
          <span>Examock — prepare smarter for your competitive exam.</span>
          <nav className="flex items-center gap-5">
            <Link to="/exams" className="transition hover:text-slate-700">
              Syllabus
            </Link>
            <Link to="/free-questions" className="transition hover:text-slate-700">
              Free questions
            </Link>
            <Link to="/login" className="transition hover:text-slate-700">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
