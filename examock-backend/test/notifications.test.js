import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import {
  filterNotificationsByExamScope,
  clampNotificationLimit,
  readRetentionMs,
  readCutoff,
  shapeInboxItem,
  countUnread,
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
// Notification inbox-filter
// (ticket 12 — listNotifications returns items still in the user's
// inbox: never-read OR read inside the 24h retention window. The Prisma
// `where` is `OR: [{ reads: none }, { reads: some, readAt >= cutoff }]`
// and includes the user's own read row. The JS-layer applies the exam-
// scope filter, shapes each row, and counts the unread ones.
//   unreadCount  = items where read === false   (bell badge)
//   inboxCount   = items.length                (total inbox size))
// ──────────────────────────────────────────────────────────────

/**
 * Pure mirror of the in-memory half of `listNotifications`: take the
 * rows Prisma returned (already filtered to inbox = unread ∪ recently-
 * read, with the user's own `reads` row attached), apply the exam-scope
 * filter, and shape each row into the API item. `unreadCount` is the
 * number of items with `read === false`; `inboxCount` is `items.length`.
 */
function filterInbox(rows, userExamTypeId) {
  const scoped = filterNotificationsByExamScope(rows, userExamTypeId);
  const items  = scoped.map((n) => shapeInboxItem(n, n.reads?.[0] ?? null));
  return { items, unreadCount: countUnread(items), inboxCount: items.length };
}

test("filterInbox: scope + counts agree (JEE user sees global + their exam)", () => {
  const rows = [
    { id: "a", examTypeId: null,    title: "A", reads: [] },
    { id: "b", examTypeId: "jee",   title: "B", reads: [] },
    { id: "c", examTypeId: "neet",  title: "C", reads: [] },
  ];
  // JEE user sees globals + their exam; neet-locked item is filtered out.
  // All three are unread here, so unreadCount === inboxCount === 2.
  const { items, unreadCount, inboxCount } = filterInbox(rows, "jee");
  assert.equal(inboxCount, 2);
  assert.equal(unreadCount, 2);
  assert.deepEqual(items.map((i) => i.id), ["a", "b"]);
});

test("filterInbox: inboxCount === items.length always", () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.uuid(),
          examTypeId: fc.oneof(fc.constant(null), fc.uuid()),
          title: fc.string({ minLength: 1, maxLength: 20 }),
          reads: fc.array(fc.record({ readAt: fc.integer() }), { maxLength: 1 }),
        }),
        { maxLength: 10 },
      ),
      fc.oneof(fc.constant(null), fc.uuid()),
      (rows, userExamTypeId) => {
        const { items, inboxCount } = filterInbox(rows, userExamTypeId);
        assert.equal(inboxCount, items.length);
      },
    ),
  );
});

test("filterInbox: rows reaching JS are guaranteed inbox-eligible by SQL", () => {
  // The server uses `OR: [{ reads: none }, { reads: some, readAt >= cutoff }]`
  // so by the time items reach the JS-side helper, the expired-read ones
  // are already gone. This test pins the contract: the helper never sees
  // an expired-read row.
  const rows = [
    { id: "still-in-inbox", examTypeId: null, title: "A", reads: [] },
  ];
  const { items, unreadCount, inboxCount } = filterInbox(rows, "jee");
  assert.equal(inboxCount, 1);
  assert.equal(unreadCount, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "still-in-inbox");
});

// ──────────────────────────────────────────────────────────────
// shapeInboxItem — row → API item mapping
// (ticket 12 retention extension: each item carries `read` + `readAt`)
// ──────────────────────────────────────────────────────────────

test("shapeInboxItem: never-read row → read=false, readAt=null", () => {
  const row = {
    id: "n-1",
    examTypeId: null,
    title: "Hello",
    body: "World",
    sentAt: null,
    createdAt: "2026-10-12T10:00:00Z",
    reads: [],
  };
  const item = shapeInboxItem(row, null);
  assert.deepEqual(item, {
    id: "n-1",
    examTypeId: null,
    title: "Hello",
    body: "World",
    sentAt: null,
    createdAt: "2026-10-12T10:00:00Z",
    read: false,
    readAt: null,
  });
});

test("shapeInboxItem: read row → read=true, readAt copied through", () => {
  const row = {
    id: "n-2",
    examTypeId: "jee",
    title: "T",
    body: "B",
    sentAt: "2026-10-12T09:00:00Z",
    createdAt: "2026-10-12T09:00:00Z",
    reads: [{ readAt: "2026-10-12T11:30:00Z" }],
  };
  const myRead = row.reads[0];
  const item = shapeInboxItem(row, myRead);
  assert.equal(item.read, true);
  assert.equal(item.readAt, "2026-10-12T11:30:00Z");
  // Pass-through fields preserved
  assert.equal(item.id, "n-2");
  assert.equal(item.title, "T");
  assert.equal(item.body, "B");
  assert.equal(item.sentAt, "2026-10-12T09:00:00Z");
  assert.equal(item.createdAt, "2026-10-12T09:00:00Z");
  assert.equal(item.examTypeId, "jee");
});

test("shapeInboxItem: ignores additional reads beyond the first", () => {
  // Defensive: Prisma caps via `take: 1`, but the helper must be robust
  // if a caller forgets. Only the first read row is consulted.
  const row = {
    id: "n-3", examTypeId: null, title: "t", body: "b",
    sentAt: null, createdAt: "2026-10-12T10:00:00Z",
    reads: [{ readAt: "first" }, { readAt: "second" }],
  };
  const item = shapeInboxItem(row, row.reads[0]);
  assert.equal(item.readAt, "first");
});

// ──────────────────────────────────────────────────────────────
// countUnread — inbox badge derivation
// ──────────────────────────────────────────────────────────────

test("countUnread: empty list → 0", () => {
  assert.equal(countUnread([]), 0);
});

test("countUnread: counts only items with read=false", () => {
  const items = [
    { read: false },
    { read: true  },
    { read: false },
    { read: true  },
    { read: false },
  ];
  assert.equal(countUnread(items), 3);
});

test("countUnread: matches `items.filter(!read).length` always", () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ read: fc.boolean(), id: fc.uuid() }), { maxLength: 30 }),
      (items) => {
        const expected = items.filter((it) => !it.read).length;
        assert.equal(countUnread(items), expected);
      },
    ),
  );
});

test("countUnread + inboxCount relationship (service-level property)", () => {
  // The service exposes both fields. Their invariant is:
  //   0 ≤ unreadCount ≤ inboxCount
  // Any list that violates this would mean read rows are leaking into
  // the unread count (or vice versa). Property-tested over random inputs.
  fc.assert(
    fc.property(
      fc.array(fc.record({ read: fc.boolean() }), { maxLength: 30 }),
      (items) => {
        const unread = countUnread(items);
        const total  = items.length;
        assert.ok(unread >= 0);
        assert.ok(unread <= total);
      },
    ),
  );
});

// ──────────────────────────────────────────────────────────────
// 24h retention — readCutoff / readRetentionMs
// (ticket 12 retention: read items drop off READ_RETENTION_MS after readAt.)
// ──────────────────────────────────────────────────────────────

test("readRetentionMs is 24 hours, in milliseconds", () => {
  assert.equal(readRetentionMs(), 24 * 60 * 60 * 1000);
});

test("readCutoff defaults to now - retention (uses real clock)", () => {
  const before = Date.now();
  const cutoff = readCutoff();
  const after = Date.now();
  // cutoff should sit somewhere in [before - 24h, after - 24h]
  assert.ok(cutoff.getTime() >= before - readRetentionMs());
  assert.ok(cutoff.getTime() <= after - readRetentionMs());
});

test("readCutoff honours an injected `now` (testable clock)", () => {
  const fixedNow = 1_700_000_000_000; // arbitrary fixed epoch ms
  const cutoff = readCutoff(fixedNow);
  assert.equal(cutoff.getTime(), fixedNow - readRetentionMs());
});

test("readCutoff is injectable for property tests", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 2 ** 48 }),
      (now) => {
        const cutoff = readCutoff(now);
        assert.equal(cutoff.getTime(), now - readRetentionMs());
      },
    ),
  );
});

/**
 * Pure mirror of the inbox-eligibility decision the SQL `where` expresses.
 * `readIds` is a Map of notificationId → readAt (ms). A row is in the
 * inbox when: it's never read, OR it was read at-or-after `cutoff`.
 */
function isInboxEligible(notificationId, readIds, cutoff) {
  const readAt = readIds.get(notificationId);
  if (readAt === undefined) return true;   // never read
  return readAt >= cutoff.getTime();       // recent read
}

test("isInboxEligible: never-read → in", () => {
  assert.equal(isInboxEligible("n-1", new Map(), readCutoff(1_000_000)), true);
});

test("isInboxEligible: read 1 min ago → in (well inside retention)", () => {
  const now = 1_000_000_000;
  const readIds = new Map([["n-1", now - 60 * 1000]]);
  assert.equal(isInboxEligible("n-1", readIds, readCutoff(now)), true);
});

test("isInboxEligible: read exactly at cutoff → in (>=)", () => {
  const now = 1_000_000_000;
  const cutoff = readCutoff(now);
  const readIds = new Map([["n-1", cutoff.getTime()]]);
  assert.equal(isInboxEligible("n-1", readIds, cutoff), true);
});

test("isInboxEligible: read 1 ms past the cutoff → out", () => {
  const now = 1_000_000_000;
  const cutoff = readCutoff(now);
  const readIds = new Map([["n-1", cutoff.getTime() - 1]]);
  assert.equal(isInboxEligible("n-1", readIds, cutoff), false);
});

test("isInboxEligible: read a full retention window ago → in (boundary is inclusive)", () => {
  // cutoff = now - retention; readAt = now - retention. readAt === cutoff ⇒
  // >= holds ⇒ still in. The "just past" test (1 ms earlier) is the
  // partner that proves the boundary is not sticky on the other side.
  const now = 1_000_000_000;
  const readIds = new Map([["n-1", now - readRetentionMs()]]);
  assert.equal(isInboxEligible("n-1", readIds, readCutoff(now)), true);
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
