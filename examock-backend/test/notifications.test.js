import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import {
  filterNotificationsByExamScope,
  clampNotificationLimit,
} from "../src/modules/student/lib/notifications.js";

// ──────────────────────────────────────────────────────────────
// filterNotificationsByExamScope
// ──────────────────────────────────────────────────────────────

test("global notifications (examTypeId null) are visible to every user", () => {
  const items = [
    { id: "1", examTypeId: null },
    { id: "2", examTypeId: "jee" },
    { id: "3", examTypeId: "neet" },
  ];
  const jeeUser = filterNotificationsByExamScope(items, "jee");
  assert.deepEqual(jeeUser.map(n => n.id), ["1", "2"]);

  const neetUser = filterNotificationsByExamScope(items, "neet");
  assert.deepEqual(neetUser.map(n => n.id), ["1", "3"]);
});

test("an unmatched exam type only sees global notifications", () => {
  const items = [
    { id: "1", examTypeId: null },
    { id: "2", examTypeId: "jee" },
  ];
  const result = filterNotificationsByExamScope(items, "neet");
  assert.deepEqual(result.map(n => n.id), ["1"]);
});

test("a null user exam type sees global broadcasts (admin / pre-onboarded)", () => {
  const items = [
    { id: "1", examTypeId: null },
    { id: "2", examTypeId: "jee" },
  ];
  const result = filterNotificationsByExamScope(items, null);
  assert.deepEqual(result.map(n => n.id), ["1"]);
});

test("preserves the input order (caller is responsible for sort)", () => {
  const items = [
    { id: "a", examTypeId: null },
    { id: "b", examTypeId: "jee" },
    { id: "c", examTypeId: null },
  ];
  const result = filterNotificationsByExamScope(items, "jee");
  assert.deepEqual(result.map(n => n.id), ["a", "b", "c"]);
});

test("empty input → empty output", () => {
  assert.deepEqual(filterNotificationsByExamScope([], "jee"), []);
});

// ──────────────────────────────────────────────────────────────
// clampNotificationLimit
// ──────────────────────────────────────────────────────────────

test("clamps a large limit down to the max", () => {
  assert.equal(clampNotificationLimit(1000), 50);
});

test("respects a custom max", () => {
  assert.equal(clampNotificationLimit(1000, 10), 10);
});

test("passes a small limit through unchanged", () => {
  assert.equal(clampNotificationLimit(5), 5);
});

test("treats zero, negative, NaN as 'no limit' → max", () => {
  assert.equal(clampNotificationLimit(0), 50);
  assert.equal(clampNotificationLimit(-1), 50);
  assert.equal(clampNotificationLimit(Number.NaN), 50);
});

test("treats undefined as 'no limit' → max", () => {
  assert.equal(clampNotificationLimit(undefined), 50);
});

// ──────────────────────────────────────────────────────────────
// toggleInSet  (used by toggleVideoWatched in student.service)
// ──────────────────────────────────────────────────────────────

import { toggleInSet } from "../src/modules/student/lib/toggle.js";

test("toggleInSet on an empty set adds the key", () => {
  const { next, wasIn } = toggleInSet(new Set(), "a");
  assert.equal(wasIn, false);
  assert.equal(next.has("a"), true);
});

test("toggleInSet on a set containing the key removes it", () => {
  const start = new Set(["a", "b"]);
  const { next, wasIn } = toggleInSet(start, "a");
  assert.equal(wasIn, true);
  assert.deepEqual([...next], ["b"]);
});

test("toggleInSet does not mutate the input set", () => {
  const start = new Set(["a"]);
  const { next } = toggleInSet(start, "b");
  assert.equal(start.has("b"), false);  // original untouched
  assert.equal(next.has("b"), true);
});

test("toggleInSet is involutive (toggle twice → original)", () => {
  fc.assert(
    fc.property(
      fc.set(fc.string({ minLength: 1, maxLength: 5 }), { maxLength: 8 }),
      fc.string({ minLength: 1, maxLength: 5 }),
      (startArr, key) => {
        const start = new Set(startArr);
        const once = toggleInSet(start, key).next;
        const twice = toggleInSet(once, key).next;
        assert.deepEqual([...twice].sort(), [...start].sort());
      },
    ),
  );
});

// ──────────────────────────────────────────────────────────────
// Admin-side `getNotifications` filter
// (ticket 10 — admin notifications filter by examTypeId when scoped)
// ──────────────────────────────────────────────────────────────

/**
 * Mirror of the SQL filter the admin service builds:
 *   - scoped admin (examTypeId set)  → their exam + global
 *   - unscoped admin (examTypeId null) → everything
 */
function adminNotificationWhere(admin) {
  return admin?.examTypeId
    ? { OR: [{ examTypeId: admin.examTypeId }, { examTypeId: null }] }
    : {};
}

test("admin where: scoped admin sees their exam + global", () => {
  const where = adminNotificationWhere({ examTypeId: "jee" });
  assert.deepEqual(where, {
    OR: [{ examTypeId: "jee" }, { examTypeId: null }],
  });
});

test("admin where: unscoped admin sees everything (empty where)", () => {
  const where = adminNotificationWhere(null);
  assert.deepEqual(where, {});
});

test("admin where: unscoped admin (no examTypeId property) sees everything", () => {
  const where = adminNotificationWhere({});
  assert.deepEqual(where, {});
});

// ──────────────────────────────────────────────────────────────
// `changeExamType` no-op detection
// (ticket 10 — same examTypeId should be a 200, no progress deletion)
// ──────────────────────────────────────────────────────────────

/**
 * Mirror of the "is this a no-op?" check in `changeExamType`. We test the
 * pure decision; the Prisma update + delete is integration territory.
 */
function isNoChangeExamType(currentExamTypeId, targetExamTypeId) {
  return currentExamTypeId === targetExamTypeId;
}

test("changeExamType is a no-op when ids match", () => {
  assert.equal(isNoChangeExamType("jee-uuid", "jee-uuid"), true);
});

test("changeExamType is not a no-op when ids differ", () => {
  assert.equal(isNoChangeExamType("jee-uuid", "neet-uuid"), false);
});

test("changeExamType is not a no-op when current is null", () => {
  assert.equal(isNoChangeExamType(null, "jee-uuid"), false);
  assert.equal(isNoChangeExamType(undefined, "jee-uuid"), false);
});

// ──────────────────────────────────────────────────────────────
// Notification unread-filter
// (ticket 12 — listNotifications returns only items the user has NOT
// opened. Read items live in `notification_reads` and are filtered out
// at the Prisma layer with `NOT: { reads: { some: { userId } } }`. We
// test the pure shape: given a list of items + a set of read ids,
// filter unread and report unreadCount = unread.length.)
// ──────────────────────────────────────────────────────────────

/**
 * Pure mirror of the in-memory half of `listNotifications`: take the
 * rows Prisma returned (all of which are unread thanks to the `NOT`
 * clause) and apply the exam-scope filter, then return `{ items, unreadCount }`.
 * The unread filter has already happened in SQL; here we just verify the
 * JS-side contract that `unreadCount === items.length`.
 */
function filterUnread(all, userExamTypeId) {
  const items = filterNotificationsByExamScope(all, userExamTypeId);
  return { items, unreadCount: items.length };
}

test("filterUnread: every item is unread by construction (empty read set)", () => {
  const all = [
    { id: "a", examTypeId: null,    title: "A" },
    { id: "b", examTypeId: "jee",   title: "B" },
    { id: "c", examTypeId: "neet",  title: "C" },
  ];
  // JEE user sees globals + their exam; neet-locked item is filtered out.
  const { items, unreadCount } = filterUnread(all, "jee");
  assert.equal(unreadCount, 2);
  assert.deepEqual(items.map((i) => i.id), ["a", "b"]);
});

test("filterUnread: unreadCount === items.length always", () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          examTypeId: fc.oneof(fc.constant(null), fc.uuid()),
          title: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        { maxLength: 10 },
      ),
      fc.oneof(fc.constant(null), fc.uuid()),
      (all, userExamTypeId) => {
        const { items, unreadCount } = filterUnread(all, userExamTypeId);
        assert.equal(unreadCount, items.length);
      },
    ),
  );
});

test("filterUnread: a previously-opened id is gone (server-side filter, not modelled here)", () => {
  // The server uses `NOT: { reads: { some: { userId } } }` so by the time
  // items reach the JS-side helper, the read ones are already gone. This
  // test pins the contract: the helper never sees a read row.
  const all = [
    { id: "still-unread", examTypeId: null, title: "A" },
  ];
  const { items, unreadCount } = filterUnread(all, "jee");
  assert.equal(unreadCount, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "still-unread");
});

// ──────────────────────────────────────────────────────────────
// markNotificationsRead — batch row construction (ticket 11 / 12)
// ──────────────────────────────────────────────────────────────

/**
 * Pure mirror of the row-construction half of `markNotificationsRead`.
 * The full service also calls `prisma.notificationRead.createMany` with
 * `skipDuplicates: true`, which is what makes re-marking the same ids a
 * no-op (integration territory).
 */
function buildMarkReadRows(userId, ids) {
  return ids.map((notificationId) => ({ userId, notificationId }));
}

test("buildMarkReadRows: one row per id, all share the userId", () => {
  const rows = buildMarkReadRows("user-1", ["n-1", "n-2", "n-3"]);
  assert.equal(rows.length, 3);
  for (const r of rows) {
    assert.equal(r.userId, "user-1");
    assert.ok(r.notificationId !== undefined);
  }
});

test("buildMarkReadRows: empty ids → empty rows", () => {
  assert.deepEqual(buildMarkReadRows("user-1", []), []);
});

test("buildMarkReadRows: dedup is the caller's job (createMany + skipDuplicates)", () => {
  // If the client sends the same id twice, the rows have a duplicate key.
  // Prisma's `skipDuplicates: true` makes the second insert a no-op, so
  // re-opening the modal can't crash the server.
  const rows = buildMarkReadRows("user-1", ["n-1", "n-1", "n-2"]);
  assert.equal(rows.length, 3);
  const notificationIds = rows.map((r) => r.notificationId);
  // No dedup at the JS layer — the DB is the source of truth.
  assert.deepEqual(notificationIds, ["n-1", "n-1", "n-2"]);
});
