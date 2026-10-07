/**
 * Duplicate detection on save.
 *
 * Rule (design Q18): match **exact text within the same chapter**. A match
 * reuses the existing `Question` instead of inserting a duplicate, and the
 * save response reports it ("3 of 30 already existed, reused.").
 *
 * Case-sensitivity decision (made explicitly, per ticket 01): matching is
 * **case-sensitive**. The spec says "exact text"; folding case would merge
 * genuinely different short stems and, worse, silently reuse a question the
 * admin did not author. Whitespace is normalised (leading/trailing trimmed,
 * runs collapsed) because PDF/CSV extraction varies spacing without changing
 * the question.
 *
 * Covered by test/duplicates.test.js (ticket 01).
 */

/**
 * Normalise a question stem for comparison: trim + collapse whitespace runs.
 * Case is deliberately preserved.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeQuestionText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function chapterOf(candidate) {
  return candidate?.topicId ?? candidate?.chapterId ?? null;
}

/**
 * Find an existing question with the same text in the same chapter.
 *
 * @param {unknown} text  the new question's stem
 * @param {string | null | undefined} chapterId  the chapter the new question belongs to
 * @param {Array<{ text?: string, topicId?: string | null, chapterId?: string | null }>} existing
 * @returns {object | null} the matching candidate, or `null`. An empty/whitespace
 *   stem never matches (it would reuse an arbitrary question).
 */
export function findDuplicate(text, chapterId, existing = []) {
  const needle = normalizeQuestionText(text);
  if (!needle) return null;

  const wantedChapter = chapterId ?? null;
  for (const candidate of Array.isArray(existing) ? existing : []) {
    if (normalizeQuestionText(candidate?.text) !== needle) continue;
    if (chapterOf(candidate) !== wantedChapter) continue;
    return candidate;
  }
  return null;
}
