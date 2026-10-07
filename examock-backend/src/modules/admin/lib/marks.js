/**
 * Marks reconciliation.
 *
 * A test's `totalMarks` is admin-entered and must equal the sum of its
 * per-question marks. The invariant is enforced at Activate (ticket 03) and
 * surfaced as the always-visible reconciliation bar in the paper grid.
 *
 * Both numbers are stored as entered — nothing is recomputed silently; this
 * only reports whether they agree.
 *
 * Design: docs/admin-pannel/simplified-test-management.md §7
 * Covered by test/marks.test.js (ticket 01).
 */

/**
 * @param {number} totalMarks  the admin-entered total on the test header
 * @param {Array<{ marks?: unknown }>} questions
 * @returns {{ ok: boolean, computed: number, count: number }}
 *   `ok`       — true iff `totalMarks === Σ question.marks`
 *   `computed` — the sum of per-question marks (what the paper is really worth)
 *   `count`    — number of questions considered
 */
export function reconcileMarks(totalMarks, questions) {
  const list = Array.isArray(questions) ? questions : [];
  const computed = list.reduce((sum, question) => {
    const marks = Number(question?.marks);
    return sum + (Number.isFinite(marks) ? marks : 0);
  }, 0);

  const total = Number(totalMarks);
  return {
    ok: typeof totalMarks === "number" && Number.isFinite(total) && total === computed,
    computed,
    count: list.length,
  };
}
