// src/utils/analytics.ts
//
// Ticket 27 (growth plan §3): a thin client for the product event spine.
//
// Call `track(name, props)` at the moments the plan names — `signup`,
// `first_question`, `first_test_completed`, `return_visit` — plus `page_view`
// and `cta_click` for the landing page (ticket 04).
//
// Rules:
//   - Fire-and-forget. A failed beacon must never break the UI.
//   - Props are non-PII (channel / utm / path). The server strips anything
//     that looks personal before writing, but we avoid sending it anyway.
//   - `sessionId` groups one browser session so the funnel can be read as
//     distinct sessions, not raw hit counts.

import config from "./config";
import { getAccessToken } from "../api/axios";

const SESSION_KEY = "examock.sid";
const VISITOR_KEY = "examock.vid";
const ATTR_KEY = "examock.attr";
const RETURN_KEY = "examock.evt.returnVisit";

// localStorage keys for the one-shot funnel events.
const ONCE_SIGNUP = "examock.evt.signup";
const ONCE_QUESTION = "examock.evt.firstQuestion";
const ONCE_TEST = "examock.evt.firstTest";

type PropValue = string | number | boolean | null | undefined;
type Props = Record<string, PropValue>;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

/**
 * Stable per-browser id. `returning` is true when a prior visit left the key
 * behind, which is how `return_visit` distinguishes a new visitor from a
 * returning one.
 */
function readVisitorId(): { id: string; returning: boolean } {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return { id: existing, returning: true };
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    return { id, returning: false };
  } catch {
    return { id: uuid(), returning: false };
  }
}

/** Capture utm_* + referrer once per session for channel attribution. */
function attribution(): Props {
  try {
    const cached = sessionStorage.getItem(ATTR_KEY);
    if (cached) return JSON.parse(cached) as Props;

    const params = new URLSearchParams(window.location.search);
    const attr: Props = {};
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]) {
      const value = params.get(key);
      if (value) attr[key] = value;
    }
    if (document.referrer) attr.referrer = document.referrer.slice(0, 300);
    attr.landing_path = window.location.pathname;

    sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return {};
  }
}

const ENDPOINT = `${config.API_URL}/events`;

function send(payload: unknown): void {
  try {
    const token = getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    void fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let analytics break the app
  }
}

/** Record one product event. Safe to call from anywhere in the UI. */
export function track(name: string, props: Props = {}): void {
  send({
    name,
    sessionId: readSessionId(),
    props: { ...attribution(), ...props },
  });
}

/** Run `fn` at most once per browser (persisted across sessions). */
function once(storageKey: string, fn: () => void): void {
  try {
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");
  } catch {
    // storage unavailable — fall through and fire anyway
  }
  fn();
}

export const trackSignup = () => once(ONCE_SIGNUP, () => track("signup"));
export const trackFirstQuestion = () =>
  once(ONCE_QUESTION, () => track("first_question"));
export const trackFirstTest = () =>
  once(ONCE_TEST, () => track("first_test_completed"));

/**
 * Call once on app boot. Fires `return_visit` for a visitor we have seen
 * before, at most once per browser session.
 */
export function initAnalytics(): void {
  const { returning } = readVisitorId();
  if (!returning) return;
  try {
    if (sessionStorage.getItem(RETURN_KEY)) return;
    sessionStorage.setItem(RETURN_KEY, "1");
  } catch {
    // ignore
  }
  track("return_visit");
}
