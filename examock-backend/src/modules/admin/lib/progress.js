/**
 * Progress fan-out.
 *
 * On submit, a single score is written to each chapter (Topic) that actually
 * contributed questions to the attempt — and only those. Fanning out to every
 * chapter in scope would stamp a full-exam score onto chapters the student
 * never drilled; updating nothing (the old `FULL` behaviour) throws away real
 * signal.
 *
 * Design: docs/admin-pannel/simplified-test-management.md §8.2, decision Q3
 * Covered by test/progress.test.js (ticket 01).
 */

/**
 * @param {Array<{ topicId?: string | null }>} questions
 * @returns {string[]} distinct, non-empty `topicId`s, sorted so the result is
 *   independent of question order in the test/attempt.
 */
export function contributingChapters(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const ids = new Set();
  for (const question of list) {
    const topicId = question?.topicId;
    if (topicId !== null && topicId !== undefined && topicId !== "") {
      ids.add(topicId);
    }
  }
  return [...ids].sort();
}
