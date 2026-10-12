/**
 * Pure helpers for the student notifications feature.
 *
 * The student side of the broadcast system reads `Notification` rows from the
 * existing admin model and filters them by exam scope — a JEE student sees
 * notifications whose `examTypeId` matches JEE, plus global notifications
 * (`examTypeId === null`).
 *
 * Per-user read state is tracked in `notification_reads` (see ticket 11).
 * The service layer is the right place for that — it needs Prisma.
 *
 * No persistence here: every function is pure and lives next to the service
 * layer so the tests can cover the logic without Prisma.
 *
 * Design: docs/student-pannel/issue-01/student-side-v1.md §4.3
 * Tickets:
 *   - 01-notifications-backend.md
 *   - 11-notifications-read-state.md
 * Tests: test/notifications.test.js
 */

const MAX_NOTIFICATIONS = 50;

// Read notifications stay in the inbox for this long after the user marks
// them as read. After this window they drop off the list AND the badge
// (badge = items.length, so the count comes along for free).
// Ticket 12 originally hid read items immediately; the 24h grace period
// makes it possible to re-open a notification you just dismissed without
// having to dig it back out of email.
const READ_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ id: string, examTypeId: string | null }} Scoped
 */

/**
 * Returns the items a user with `userExamTypeId` should see.
 * `null` `userExamTypeId` (e.g. admin / pre-onboarded) only sees global.
 * Order is preserved as input — caller is responsible for sorting.
 *
 * @template {Scoped} T
 * @param {readonly T[]} items
 * @param {string | null | undefined} userExamTypeId
 * @returns {T[]}
 */
export function filterNotificationsByExamScope(items, userExamTypeId) {
  return items.filter((n) => {
    if (n.examTypeId === null) return true;        // global
    if (userExamTypeId == null) return false;       // scoped only → blocked
    return n.examTypeId === userExamTypeId;        // scoped match
  });
}

/**
 * Clamp a requested `limit` for `prisma.findMany`. Anything missing,
 * non-positive, or non-finite becomes "no limit", which is capped at `max`.
 *
 * @param {number | undefined} limit
 * @param {number} [max=50]
 * @returns {number}
 */
export function clampNotificationLimit(limit, max = MAX_NOTIFICATIONS) {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return max;
  }
  return Math.min(Math.floor(limit), max);
}

/**
 * How long a read notification stays in the inbox before it drops off.
 * Exported so the service and tests share one source of truth.
 *
 * @returns {number} retention window in milliseconds
 */
export function readRetentionMs() {
  return READ_RETENTION_MS;
}

/**
 * The wall-clock `Date` such that any `NotificationRead.readAt` older than
 * this should be considered expired and hidden from the inbox. Pure:
 * injectable `now` keeps the math testable without freezing the clock.
 *
 * @param {number} [now=Date.now()]
 * @returns {Date}
 */
export function readCutoff(now = Date.now()) {
  return new Date(now - READ_RETENTION_MS);
}

/**
 * @typedef {{
 *   id: string,
 *   examTypeId: string | null,
 *   title: string,
 *   body: string,
 *   sentAt: Date | string | null,
 *   createdAt: Date | string,
 *   reads: ReadRow[],
 * }} NotificationRow
 *
 * @typedef {{ readAt: Date | string }} ReadRow
 */

/**
 * Map a Prisma notification row + the (at most one) NotificationRead row
 * belonging to the current user into the API-shape item. The `read` and
 * `readAt` flags are what lets the client style read items differently
 * while keeping them visible for the 24h retention window.
 *
 * `myRead === null` ⇒ never read. `myRead` with a `readAt` ⇒ read.
 *
 * Pure (no Prisma, no Date.now) so it's trivially unit-testable.
 *
 * @param {NotificationRow} row
 * @param {ReadRow | null} myRead
 * @returns {{
 *   id: string,
 *   examTypeId: string | null,
 *   title: string,
 *   body: string,
 *   sentAt: Date | string | null,
 *   createdAt: Date | string,
 *   read: boolean,
 *   readAt: Date | string | null,
 * }}
 */
export function shapeInboxItem(row, myRead) {
  return {
    id:         row.id,
    examTypeId: row.examTypeId,
    title:      row.title,
    body:       row.body,
    sentAt:     row.sentAt,
    createdAt:  row.createdAt,
    read:       myRead !== null,
    readAt:     myRead?.readAt ?? null,
  };
}

/**
 * @typedef {{ read: boolean }} InboxItem
 */

/**
 * Count the unread items in an inbox-shaped payload. Pure: trivial
 * filter+length; the helper exists so the JS-side derivation is pinned
 * by a test instead of being implicit in `items.length`.
 *
 * @param {readonly InboxItem[]} items
 * @returns {number}
 */
export function countUnread(items) {
  let n = 0;
  for (const it of items) if (!it.read) n++;
  return n;
}