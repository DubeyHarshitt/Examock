// src/modules/events/events.service.js
//
// Ticket 27 (growth plan §3): the product "measurement spine". Every funnel
// event the plan names is recorded here.
//
// Deliberately split into pure helpers (allowlist, prop sanitising, request
// parsing, range resolution) and thin Prisma calls, so the validation logic is
// unit-testable in CI without a database — the same pattern as admin ticket 01
// and student ticket 10.

import prisma from "../../config/prisma.js";

// The four events the growth plan names, plus `share` / `referral_signup` /
// `feedback_submitted` (listed in the ticket) and the two ticket 04 needs:
// `page_view` ("page views ... are tracked") and `cta_click` (the "Try free"
// call to action).
export const EVENT_NAMES = Object.freeze([
  "page_view",
  "cta_click",
  "signup",
  "first_question",
  "first_test_completed",
  "return_visit",
  "share",
  "referral_signup",
  "feedback_submitted",
]);

const EVENT_NAME_SET = new Set(EVENT_NAMES);

// Props must stay aggregate-friendly: no emails, phones, names, or the free
// text a student typed. We drop any key that looks like PII rather than
// trusting each caller, and cap the serialized size so one event can't bloat
// the table.
const PII_KEY = /email|phone|mobile|name|question|answer|password|token|otp|address/i;
export const PROPS_MAX_BYTES = 4096;
export const MAX_BATCH = 20;
const MAX_STRING = 500;

export const isKnownEvent = (name) =>
  typeof name === "string" && EVENT_NAME_SET.has(name);

const truncate = (value, max = MAX_STRING) =>
  typeof value === "string" && value.length > max ? value.slice(0, max) : value;

/**
 * Keep flat scalar props (+ shallow scalar arrays) only. Drops PII-looking
 * keys and any nested object. Returns null when there is nothing to store.
 */
export const sanitizeProps = (props) => {
  if (!props || typeof props !== "object" || Array.isArray(props)) return null;

  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEY.test(key)) continue;
    if (value === undefined) continue;

    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      out[key] = typeof value === "string" ? truncate(value) : value;
    } else if (Array.isArray(value)) {
      out[key] = value
        .filter((v) => ["string", "number", "boolean"].includes(typeof v))
        .slice(0, 20)
        .map((v) => (typeof v === "string" ? truncate(v, 100) : v));
    }
    // nested objects are intentionally dropped — props is a flat bag by contract
  }

  if (Object.keys(out).length === 0) return null;
  if (JSON.stringify(out).length > PROPS_MAX_BYTES) return null;
  return out;
};

/**
 * Normalise a request body into a list of `{ name, props, sessionId }`.
 * Accepts either a single event body or `{ events: [...] }`.
 * Returns `{ error }` on an unknown name or an out-of-bounds batch.
 */
export const parseBatch = (body) => {
  const raw = Array.isArray(body?.events) ? body.events : [body];
  if (raw.length === 0 || raw.length > MAX_BATCH) return { error: "invalid_batch" };

  const events = [];
  for (const item of raw) {
    if (!isKnownEvent(item?.name)) return { error: "unknown_event" };
    const sessionId =
      typeof item.sessionId === "string" && item.sessionId.length <= 64
        ? item.sessionId
        : null;
    events.push({ name: item.name, props: sanitizeProps(item.props), sessionId });
  }
  return { events };
};

/** Resolve the summary window from query params. Defaults to the last 7 days. */
export const resolveRange = (query = {}, now = new Date()) => {
  const until =
    query.until && !Number.isNaN(new Date(query.until).getTime())
      ? new Date(query.until)
      : now;

  if (query.since && !Number.isNaN(new Date(query.since).getTime())) {
    return { since: new Date(query.since), until };
  }

  const days = Number(query.days);
  const span = Number.isFinite(days) && days > 0 && days <= 365 ? days : 7;
  return { since: new Date(until.getTime() - span * 24 * 60 * 60 * 1000), until };
};

// ── Prisma-backed writes / reads ─────────────────────────────

export const recordEvents = async ({ userId = null, events }) => {
  const data = events.map((e) => ({
    userId,
    sessionId: e.sessionId,
    name: e.name,
    props: e.props ?? undefined,
  }));

  if (data.length === 1) {
    await prisma.event.create({ data: data[0] });
  } else {
    await prisma.event.createMany({ data });
  }
  return { recorded: data.length };
};

export const summarizeEvents = async ({ since, until }) => {
  const where = { createdAt: { gte: since, lte: until } };

  const grouped = await prisma.event.groupBy({
    by: ["name"],
    where,
    _count: { _all: true },
  });
  const byName = Object.fromEntries(grouped.map((g) => [g.name, g._count._all]));

  const [sessions, users] = await Promise.all([
    prisma.event.findMany({
      where: { ...where, sessionId: { not: null } },
      distinct: ["sessionId"],
      select: { sessionId: true },
    }),
    prisma.event.findMany({
      where: { ...where, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  return {
    since,
    until,
    total: grouped.reduce((sum, g) => sum + g._count._all, 0),
    byName,
    distinctSessions: sessions.length,
    distinctUsers: users.length,
    funnel: ["signup", "first_question", "first_test_completed", "return_visit"].map(
      (name) => ({ name, count: byName[name] ?? 0 }),
    ),
  };
};
