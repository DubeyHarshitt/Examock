/**
 * Derived test scope.
 *
 * The only scope input on `MockTest` is `subjectId` (nullable). The old
 * `TestType { CHAPTER | MODULE | FULL }` taxonomy is gone: scope is derived,
 * never stored.
 *
 *   subjectId null   ⇒ the whole exam  ⇒ scope "EXAM"
 *   subjectId set    ⇒ one subject     ⇒ scope "SUBJECT"
 *
 * Design: docs/admin-pannel/simplified-test-management.md §3
 * Covered by test/scope.test.js (ticket 01).
 */

export const SCOPE = Object.freeze({
  EXAM: "EXAM",
  SUBJECT: "SUBJECT",
});

/**
 * @param {string | null | undefined} subjectId
 * @returns {"EXAM" | "SUBJECT"} `EXAM` for any falsy subjectId.
 */
export function deriveScope(subjectId) {
  return subjectId ? SCOPE.SUBJECT : SCOPE.EXAM;
}
