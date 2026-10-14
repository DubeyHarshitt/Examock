// src/modules/test/lib/resumeAnswers.js
//
// Pure helper for resuming an in-progress attempt (audit F12: the engine never
// learned which questions were already answered, so resume showed 0 answered,
// a wrong "Answer saved" label and an all-unanswered palette).
//
// Deliberately free of prisma/config imports so it is unit-testable without a
// database (same discipline as lib/scoring.js and admin/lib/marks.js).

/**
 * Flatten `answersJson` ({ [questionId]: option }) into positional records the
 * client can seed its store and palette from.
 *
 * `questionIndex` is derived from the POSITION in `orderedQuestionIds` — the
 * exact ordering getQuestion() walks (`orderBy: orderIndex asc` plus
 * `skip: questionIndex`). It is deliberately NOT the raw `orderIndex` value,
 * which need not be 0-based.
 *
 * Cleared (null) entries and question ids no longer on the paper are dropped.
 *
 * @param {Record<string, string|null>|null|undefined} answersJson
 * @param {string[]} orderedQuestionIds question ids in display order
 * @returns {{questionId: string, questionIndex: number, selectedOption: string}[]}
 */
export function mapSavedAnswers(answersJson, orderedQuestionIds) {
  const answers = answersJson ?? {};
  const indexOf = new Map(orderedQuestionIds.map((id, i) => [id, i]));
  const saved = [];

  for (const [questionId, selectedOption] of Object.entries(answers)) {
    if (selectedOption == null) continue; // cleared / never answered
    const questionIndex = indexOf.get(questionId);
    if (questionIndex === undefined) continue; // stale id, paper was edited
    saved.push({ questionId, questionIndex, selectedOption });
  }

  // Ascending so clients can apply them in question order.
  return saved.sort((a, b) => a.questionIndex - b.questionIndex);
}
