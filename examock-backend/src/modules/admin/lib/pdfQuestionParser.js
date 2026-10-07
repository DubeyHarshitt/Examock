/**
 * Heuristic question parser over flat PDF text.
 *
 * `pdf-parse` returns one string with no layout: no page numbers, no columns,
 * no images, no OCR (design §8.5). Turning a paper into structured questions
 * is therefore a best-effort heuristic, and failure must be *visible*:
 * anything unrecognised is emitted as a flagged row (NEEDS_REVIEW) with a
 * reason — never dropped silently.
 *
 * Output is the shared **draft-row contract** used by the paper grid, CSV
 * import and PDF ingestion. Nothing here touches the database; rows only
 * become `questions` when an admin reviews them and clicks Save (decision Q19).
 *
 *   { kind: "new", text, optionA..optionD, correctOption: null,
 *     parseStatus: "OK" | "NEEDS_REVIEW", parseError, hadFigure }
 *
 * - Correct answers are **never** extracted (Q22) — `correctOption` is always null.
 * - Figures are **never** extracted (Q32) — `hadFigure` is a heuristic flag
 *   that defaults the grid's per-row figure checkbox on.
 *
 * Design: docs/admin-pannel/simplified-test-management.md §8.5, ticket 09.
 * Boundary detection covered by test/pdfQuestionParser.test.js (ticket 01).
 */

export const PARSE_OK = "OK";
export const PARSE_REVIEW = "NEEDS_REVIEW";

/**
 * Question number at the start of a line: "12." / "12)" (numeric form must
 * have the punctuator, so a year like "1947 war…" is not a boundary) or
 * "Q12" / "Q.12" / "Question 12." (Q-form, punctuator optional).
 * Group 1 = Q-form number, group 2 = numeric-form number.
 */
const QUESTION_START = /^(?:Q(?:uestion)?\s*\.?\s*(\d+)(?=\D|$)|(\d+)\s*[.)])/i;

/** Strip the leading question number so the remainder becomes stem text. */
const QUESTION_NUMBER = /^(?:Q(?:uestion)?\s*\.?\s*\d+|\d+)\s*[.)]?\s*/i;

/** "(a)" anywhere in a line — the common "stem then (a) ... (b) ..." layout. */
const INLINE_PAREN = /\(([a-dA-D])\)/g;

/** A marker at the very start of a line: "(a)", "A.", "a)", "1.", "2)". */
const LEADING_MARKER = /^(\(([a-dA-D])\)|([a-dA-D])[.)]|(\d{1,2})[.)])\s*/;

/** Figures are never extracted; these hints flag that one probably existed. */
const FIGURE_HINT =
  /\b(?:fig(?:ure)?s?\.?|diagram|illustration|graph|sketch|shown (?:in|below|above)|refer to the)\b/i;

/** Shortest stem considered plausible for typed text — shorter likely lost an image. */
const SHORT_STEM = 25;

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * NFKC (ligatures, full-width digits), de-hyphenate line breaks, collapse
 * horizontal whitespace, trim lines, drop repeated headers/footers.
 *
 * Header/footer heuristic: an identical line repeated 3+ times that contains a
 * digit (page number, year, exam code) and matches neither a question nor an
 * option marker. Repetition alone is not enough — option lines repeat often.
 */
export function normaliseText(text) {
  const lines = String(text ?? "")
    .normalize("NFKC")
    .replace(/\u00ad/g, "") // soft hyphen
    .replace(/-\s*\n\s*/g, "") // "phys-\nical" → "physical"
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // collapse tabs/spaces, keep line breaks
    .split("\n")
    .map((line) => line.trim());

  const counts = new Map();
  for (const line of lines) {
    if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return lines.filter((line) => !isHeaderFooter(line, counts.get(line) ?? 0)).join("\n");
}

function isHeaderFooter(line, count) {
  if (count < 3) return false;
  if (line.length > 100) return false;
  if (!/\d/.test(line)) return false; // page numbers, years, exam codes carry digits
  if (QUESTION_START.test(line)) return false;
  if (line.match(LEADING_MARKER)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

function letterIndex(ch) {
  return ch ? ch.toLowerCase().charCodeAt(0) - 97 : null; // a→0 … d→3
}

function markerIndex(letter, numeric) {
  if (letter) {
    const idx = letterIndex(letter);
    return idx >= 0 && idx <= 3 ? idx : null;
  }
  const n = Number(numeric);
  return n >= 1 && n <= 4 ? n - 1 : null; // 1→0 … 4→3
}

/**
 * Split one line into segments: `{ marker, text }` where `marker` is the
 * 0-based option slot (A=0…D=3) or `null` for text that belongs to the stem
 * (before any marker) or the current option (after one).
 */
function splitLineMarkers(line) {
  const out = [];
  let rest = line;

  const lead = LEADING_MARKER.exec(rest);
  if (lead) {
    const idx = markerIndex(lead[2] ?? lead[3], lead[4]);
    if (idx !== null) {
      out.push({ marker: idx, text: "" });
      rest = rest.slice(lead[0].length);
    }
  }

  let cursor = 0;
  let m;
  INLINE_PAREN.lastIndex = 0;
  while ((m = INLINE_PAREN.exec(rest))) {
    const idx = letterIndex(m[1]);
    if (idx === null || idx > 3) continue;
    if (m.index > cursor) out.push({ marker: null, text: rest.slice(cursor, m.index) });
    out.push({ marker: idx, text: "" });
    cursor = m.index + m[0].length;
  }
  if (cursor < rest.length) out.push({ marker: null, text: rest.slice(cursor) });

  return out.filter((seg) => seg.marker !== null || seg.text.trim() !== "");
}

function countMarkers(line) {
  return splitLineMarkers(line).filter((seg) => seg.marker !== null).length;
}

// ---------------------------------------------------------------------------
// Boundary detection
// ---------------------------------------------------------------------------

function matchQuestionStart(line) {
  const m = QUESTION_START.exec(line);
  if (!m) return null;
  const number = Number(m[1] ?? m[2]);
  if (!Number.isFinite(number)) return null;
  return { number, qForm: m[1] !== undefined }; // "Q1" form vs "1." form
}

/**
 * Does this candidate line start a new question?
 *
 * Ambiguity: numbered options ("1. 2. 3. 4.") look exactly like numbered
 * questions, and numbering restarts per subject in real papers. Resolution:
 *
 *  1. no current block            → boundary
 *  2. "Q1"/"Q.1" form             → boundary (Q-form never starts an option)
 *  3. option collection in flight (1–3 seen) and the candidate is 1–4 →
 *     **option**, not a boundary (beats the sequence rule on purpose: after
 *     "1." an option "2." must not become question 2)
 *  4. candidate === previous + 1  → boundary (sequence continues)
 *  5. candidate === 1, previous !== 1, block has options → boundary (subject restart)
 *  6. otherwise                   → continuation line
 */
function isBoundary(candidate, current) {
  if (!current) return true;
  if (candidate.qForm) return true;
  if (current.optionCount >= 1 && current.optionCount < 4 && candidate.number <= 4) return false;
  if (candidate.number === current.number + 1) return true;
  if (candidate.number === 1 && current.number !== 1 && current.optionCount >= 1) return true;
  return false;
}

/**
 * Split normalised text into raw question blocks — the boundary-detection
 * step on its own. Text before the first boundary is treated as preamble
 * (instructions, headers) and dropped. If nothing matches a boundary, `[]` is
 * returned and the caller flags the whole text as one row.
 *
 * @param {string} text
 * @returns {Array<{ number: number | null, lines: string[], optionCount: number }>}
 */
export function splitQuestionBlocks(text) {
  const lines = normaliseText(text).split("\n").filter((line) => line !== "");
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const candidate = matchQuestionStart(line);
    if (candidate && isBoundary(candidate, current)) {
      if (current) blocks.push(current);
      current = { number: candidate.number, lines: [line], optionCount: 0 };
      continue;
    }
    if (!current) continue; // preamble before the first question
    current.lines.push(line);
    const subject = current.lines.length === 1 ? line.replace(QUESTION_NUMBER, "") : line;
    current.optionCount += countMarkers(subject);
  }
  if (current) blocks.push(current);
  return blocks;
}

// ---------------------------------------------------------------------------
// Block → draft row
// ---------------------------------------------------------------------------

function assemble(block) {
  const stem = [];
  const options = [null, null, null, null];
  let currentIdx = null;

  block.lines.forEach((line, i) => {
    const work = i === 0 ? line.replace(QUESTION_NUMBER, "") : line;
    for (const seg of splitLineMarkers(work)) {
      if (seg.marker !== null) currentIdx = seg.marker;
      const text = seg.text.replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (currentIdx === null) {
        stem.push(text);
      } else if (options[currentIdx] === null) {
        options[currentIdx] = text;
      } else {
        options[currentIdx] += " " + text;
      }
    }
  });

  return { text: stem.join(" ").trim(), options };
}

function toRow(text, options) {
  const filled = options.filter((option) => option !== null && option !== "").length;
  let parseError = null;

  if (!text) parseError = "missing question text";
  else if (filled !== 4) parseError = `found ${filled} options, expected 4`;

  const hadFigure =
    FIGURE_HINT.test(text) || (text.length > 0 && text.length < SHORT_STEM);

  return {
    kind: "new",
    text,
    optionA: options[0] ?? "",
    optionB: options[1] ?? "",
    optionC: options[2] ?? "",
    optionD: options[3] ?? "",
    correctOption: null, // never extracted (Q22) — the admin ticks it
    parseStatus: parseError ? PARSE_REVIEW : PARSE_OK,
    parseError,
    hadFigure,
  };
}

/**
 * Parse flat text into draft rows.
 *
 * @param {string} text
 * @returns {Array<object>} draft rows — OK or NEEDS_REVIEW, never dropped.
 */
export function parseQuestionBlocks(text) {
  const blocks = splitQuestionBlocks(text);
  if (blocks.length === 0) {
    const normalised = normaliseText(text).split("\n").filter((line) => line !== "").join("\n").trim();
    if (!normalised) return [];
    // No question boundary anywhere: keep everything as one flagged row.
    return [toRow(normalised.replace(/\n/g, " "), [null, null, null, null])];
  }
  return blocks.map((block) => {
    const { text: stem, options } = assemble(block);
    return toRow(stem, options);
  });
}
