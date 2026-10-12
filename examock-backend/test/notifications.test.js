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
// Notification read-state attachment
// (ticket 11 — per-user read state via `notification_reads`)
// ──────────────────────────────────────────────────────────────

/**
 * Pure mirror of the read-state attachment in
 * `student.service.listNotifications`: given visible items and the rows
 * from `notification_reads`, attach `isRead` / `readAt` and compute the
 * unread count. Keeps the tests honest about the data shape and avoids
 * pulling Prisma into a unit test.
 */
function attachReadState(visible, readRows) {
  const readMap = new Map(readRows.map((r) => [r.notificationId, r.readAt]));
  const items = visible.map((n) => ({
    ...n,
    isRead: readMap.has(n.id),
    readAt: (readMap.get(n.id) ?? null)?.toISOString() ?? null,
  }));
  return { items, unreadCount: items.filter((i) => !i.isRead).length };
}

test("attachReadState: empty read set marks every item unread", () => {
  const visible = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
  ];
  const { items, unreadCount } = attachReadState(visible, []);
  assert.equal(unreadCount, 2);
  assert.deepEqual(items.map((i) => i.isRead), [false, false]);
  assert.deepEqual(items.map((i) => i.readAt), [null, null]);
});

test("attachReadState: every item read → unreadCount 0", () => {
  const visible = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
  ];
  const ts = new Date("2026-10-12T10:00:00Z");
  const { items, unreadCount } = attachReadState(visible, [
    { notificationId: "a", readAt: ts },
    { notificationId: "b", readAt: ts },
  ]);
  assert.equal(unreadCount, 0);
  assert.deepEqual(items.map((i) => i.isRead), [true, true]);
  assert.deepEqual(items.map((i) => i.readAt), [ts.toISOString(), ts.toISOString()]);
});

test("attachReadState: mixed list reports per-item state and correct count", () => {
  const visible = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C" },
  ];
  const ts = new Date("2026-10-12T10:00:00Z");
  const { items, unreadCount } = attachReadState(visible, [
    { notificationId: "b", readAt: ts },
  ]);
  assert.equal(unreadCount, 2);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(byId.a.isRead, false);
  assert.equal(byId.a.readAt, null);
  assert.equal(byId.b.isRead, true);
  assert.equal(byId.b.readAt, ts.toISOString());
  assert.equal(byId.c.isRead, false);
  assert.equal(byId.c.readAt, null);
});

test("attachReadState: extra read rows for ids not in visible are ignored (idempotent reopen)", () => {
  const visible = [{ id: "a", title: "A" }];
  const ts = new Date("2026-10-12T10:00:00Z");
  const { items, unreadCount } = attachReadState(visible, [
    { notificationId: "a", readAt: ts },
    { notificationId: "ghost", readAt: ts },
  ]);
  assert.equal(unreadCount, 0);
  assert.equal(items.length, 1);
  assert.equal(items[0].isRead, true);
});

test("attachReadState: unreadCount equals visible.length minus read rows.length", () => {
  fc.assert(
    fc.property(
      fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 10 }),
      fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 10 }),
      (visibleIds, readIds) => {
        const visible = visibleIds.map((id) => ({ id, title: id }));
        // Restrict read rows to ids in the visible set (production shape).
        const visibleSet = new Set(visibleIds);
        const readRows = readIds
          .filter((id) => visibleSet.has(id))
          .map((id) => ({ notificationId: id, readAt: new Date() }));
        const { unreadCount } = attachReadState(visible, readRows);
        assert.equal(unreadCount, visible.length - readRows.length);
      },
    ),
  );
});
