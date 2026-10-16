// src/pages/public/PublicShell.tsx — chrome for all public SEO routes
// (ticket 24): header with crawlable <Link>s, footer with internal links,
// and an <Outlet /> for the page itself.
//
// Auth-aware: a fully onboarded user sees "Dashboard" instead of "Sign in",
// so logged-in students can browse the syllabus pages without dead ends.
import { Link, Outlet, useNavigate } from "react-router-dom";
import { track } from "../../utils/analytics";
import { useAuthStore } from "../../store/auth.store";

const NAV_LINKS = [
  { to: "/exams", label: "Syllabus" },
  { to: "/free-questions", label: "Free questions" },
];

export default function PublicShell() {
  const navigate = useNavigate();
  const { isAuthenticated, isFullyOnboarded } = useAuthStore();
  const onboarded = isAuthenticated() && isFullyOnboarded();

  const onSignIn = () => {
    track("cta_click", { cta: "sign_in", location: "public_nav" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/logo-mark.svg"
            alt="Examock logo"
            className="h-9 w-9"
            draggable={false}
          />
          <span className="text-lg font-bold tracking-tight">Examock</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
          {onboarded ? (
            <Link
              to="/"
              className="ml-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Dashboard
            </Link>
          ) : (
            <button
              onClick={onSignIn}
              className="ml-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Sign in
            </button>
          )}
        </nav>
      </header>

      <Outlet />

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-slate-500 sm:flex-row">
          <span className="text-xs text-slate-400">
            Examock — prepare smarter for your competitive exam.
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
            <Link to="/login" className="transition hover:text-slate-900">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
