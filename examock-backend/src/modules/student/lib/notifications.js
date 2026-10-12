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