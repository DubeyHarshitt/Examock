// src/pages/admin/analytics/EventsFunnel.tsx
//
// Ticket 38 — the weekly growth decision surface. Renders the six Monday-morning
// numbers from GET /api/events/summary (product events recorded by ticket 27):
//   visitors → sign-ups → % who ask a first question → % who finish a test →
//   week-1 return → referrals.
//
// "Week-1 return" note: the summary endpoint reports raw `return_visit` counts,
// not a signup-cohort rate, so we show the return-visit count and its share of
// visitors as a labelled proxy rather than fabricating cohort precision.

import { useEffect } from "react";
import { Card, Badge, EmptyState, Skeleton } from "../../../components/ui";
import { useAdminStore } from "../../../store/admin/admin.store";

const RANGES = [7, 30, 90] as const;

// Order matters — this is the funnel top → bottom.
const FUNNEL_ORDER = [
  "signup",
  "first_question",
  "first_test_completed",
  "return_visit",
] as const;

const FUNNEL_LABELS: Record<string, string> = {
  signup: "Signed up",
  first_question: "Asked a first question",
  first_test_completed: "Finished a first test",
  return_visit: "Came back",
};

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export function EventsFunnel() {
  const { events, eventsLoading, eventsDays, fetchEvents } = useAdminStore();

  // `fetchEvents` is a stable zustand action, so this runs once on mount.
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const byName = events?.byName ?? {};
  const visitors = events?.distinctSessions ?? 0;
  const signups = byName["signup"] ?? 0;
  const firstQ = byName["first_question"] ?? 0;
  const firstTest = byName["first_test_completed"] ?? 0;
  const ret = byName["return_visit"] ?? 0;
  const referrals = byName["referral_signup"] ?? 0;

  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((n) => byName[n] ?? 0));

  const numbers = events
    ? [
        { label: "Visitors", value: visitors, hint: "distinct sessions" },
        { label: "Sign-ups", value: signups, hint: "signup events" },
        {
          label: "Asked a question",
          value: `${pct(firstQ, signups)}%`,
          hint: `${firstQ} of ${signups} sign-ups`,
        },
        {
          label: "Finished a test",
          value: `${pct(firstTest, signups)}%`,
          hint: `${firstTest} of ${signups} sign-ups`,
        },
        {
          label: "Return (wk-1 proxy)",
          value: `${pct(ret, visitors)}%`,
          hint: `${ret} return visits`,
        },
        { label: "Referrals", value: referrals, hint: "referral sign-ups" },
      ]
    : [];

  // Raw counts behind the numbers, biggest first.
  const allEvents = Object.entries(byName).sort((a, b) => b[1] - a[1]);

  return (
    <Card
      title="Growth funnel"
      subtitle="Weekly decision numbers from product events"
      action={
        <div className="flex gap-1">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => fetchEvents(d)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                eventsDays === d
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      }
    >
      {eventsLoading && !events ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !events || events.total === 0 ? (
        <EmptyState
          title="No events yet"
          description="Once landing-page and funnel events are recorded, the weekly numbers appear here."
        />
      ) : (
        <div className="space-y-6">
          {/* The six Monday numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {numbers.map((n) => (
              <div key={n.label} className="rounded-xl border border-slate-100 p-3">
                <p className="text-2xl font-bold text-slate-900 leading-tight">
                  {typeof n.value === "number"
                    ? n.value.toLocaleString("en-IN")
                    : n.value}
                </p>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                  {n.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{n.hint}</p>
              </div>
            ))}
          </div>

          {/* Funnel bars */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Funnel (last {eventsDays} days)
            </p>
            <ul className="space-y-2.5">
              {FUNNEL_ORDER.map((name) => {
                const count = byName[name] ?? 0;
                const width = Math.round((count / maxFunnel) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">
                        {FUNNEL_LABELS[name]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {count.toLocaleString("en-IN")}
                        {name !== "signup" && signups > 0 && (
                          <span className="ml-1.5 text-slate-400">
                            ({pct(count, signups)}% of sign-ups)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Raw counts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              All events
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allEvents.map(([name, count]) => (
                <Badge key={name} variant="info">
                  {name}: {count.toLocaleString("en-IN")}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Week-1 return is approximated by <code>return_visit</code> events (the
            summary reports raw counts, not a signup-cohort rate). Window:{" "}
            {new Date(events.since).toLocaleDateString("en-IN")} –{" "}
            {new Date(events.until).toLocaleDateString("en-IN")}.
          </p>
        </div>
      )}
    </Card>
  );
}

export default EventsFunnel;
