import test from "node:test";
import assert from "node:assert/strict";

import {
  EVENT_NAMES,
  MAX_BATCH,
  isKnownEvent,
  sanitizeProps,
  parseBatch,
  resolveRange,
} from "../src/modules/events/events.service.js";

// ── allowlist ────────────────────────────────────────────────

test("the four plan events are in the allowlist", () => {
  for (const name of [
    "signup",
    "first_question",
    "first_test_completed",
    "return_visit",
  ]) {
    assert.equal(isKnownEvent(name), true, `${name} should be allowed`);
  }
});

test("unknown or non-string names are rejected", () => {
  assert.equal(isKnownEvent("drop_table"), false);
  assert.equal(isKnownEvent(undefined), false);
  assert.equal(isKnownEvent(""), false);
});

// ── prop sanitising ──────────────────────────────────────────

test("sanitizeProps keeps flat scalars and drops PII keys", () => {
  const out = sanitizeProps({
    path: "/",
    utm_source: "reddit",
    email: "a@b.com",
    question: "secret",
    nested: { deep: true },
  });

  assert.deepEqual(out, { path: "/", utm_source: "reddit" });
});

test("sanitizeProps returns null for empty or non-object input", () => {
  assert.equal(sanitizeProps(undefined), null);
  assert.equal(sanitizeProps([]), null);
  assert.equal(sanitizeProps({ email: "a@b.com" }), null);
});

test("sanitizeProps truncates long strings", () => {
  const out = sanitizeProps({ path: "a".repeat(900) });
  assert.equal(out.path.length, 500);
});

// ── request parsing ──────────────────────────────────────────

test("parseBatch accepts a single event body", () => {
  const parsed = parseBatch({ name: "page_view", props: { path: "/" }, sessionId: "s1" });
  assert.deepEqual(parsed.events, [
    { name: "page_view", props: { path: "/" }, sessionId: "s1" },
  ]);
});

test("parseBatch accepts a batch and normalises a bad sessionId to null", () => {
  const parsed = parseBatch({ events: [{ name: "page_view", sessionId: "x".repeat(100) }] });
  assert.equal(parsed.events[0].sessionId, null);
});

test("parseBatch rejects an unknown event name", () => {
  assert.deepEqual(parseBatch({ name: "nope" }), { error: "unknown_event" });
});

test("parseBatch rejects an empty or oversized batch", () => {
  assert.deepEqual(parseBatch({ events: [] }), { error: "invalid_batch" });
  const tooMany = { events: Array.from({ length: MAX_BATCH + 1 }, () => ({ name: "page_view" })) };
  assert.deepEqual(parseBatch(tooMany), { error: "invalid_batch" });
});

// ── range resolution ─────────────────────────────────────────

test("resolveRange defaults to the last 7 days", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  const { since, until } = resolveRange({}, now);
  assert.equal(until.toISOString(), now.toISOString());
  assert.equal(since.toISOString(), "2026-10-08T12:00:00.000Z");
});

test("resolveRange honours an explicit since/until", () => {
  const { since, until } = resolveRange({
    since: "2026-10-01T00:00:00.000Z",
    until: "2026-10-02T00:00:00.000Z",
  });
  assert.equal(since.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(until.toISOString(), "2026-10-02T00:00:00.000Z");
});

test("resolveRange caps a nonsense days value back to 7", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  const { since } = resolveRange({ days: "9999" }, now);
  assert.equal(since.toISOString(), "2026-10-08T12:00:00.000Z");
});

// ── sanity: every exported name is unique ────────────────────

test("EVENT_NAMES has no duplicates", () => {
  assert.equal(new Set(EVENT_NAMES).size, EVENT_NAMES.length);
});
