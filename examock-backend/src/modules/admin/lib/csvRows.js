/**
 * CSV ingestion (ticket 08) — server-side parse of the shared draft-row
 * contract. The grid paste path (ticket 06) and the future PDF path (ticket
 * 09) all produce the same row shape:
 *
 *   { kind: "new", chapterId?, text, optionA..D, correctOption?,
 *     explanation?, imageUrl?, difficulty?, marks?, negMarks? }
 *
 * Format (header-driven — columns work in ANY order):
 *
 *   text,optionA,optionB,optionC,optionD,correctOption,explanation,imageUrl,difficulty,marks,negativeMarks,chapterId
 *   "2+2 equals?",3,4,5,6,B,Basic arithmetic,,MEDIUM,1,0,
 *
 * Quoted fields, embedded commas and newlines are handled by `csv-parse`.
 * `correctOption` is optional and NEVER inferred — a row without one lands in
 * the grid unticked and Activate blocks until it is ticked (ticket 03).
 * A malformed row is reported individually with its 1-based line number
 * instead of failing the whole file. `isReusable` is pinned false: past-paper
 * questions are poor practice items and would otherwise leak into bank
 * browsers and any future generated paper.
 *
 * Covered by test/csvRows.test.js.
 */
import { parse } from "csv-parse/sync";
import { z } from "zod";

const emptyToUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
};

const normalizeUpper = (value) => {
  const s = emptyToUndefined(value);
  return s ? s.toUpperCase() : undefined;
};

/** Read the first non-empty of the given column names (alias tolerance). */
const pick = (record, ...names) => {
  for (const name of names) {
    const v = emptyToUndefined(record[name]);
    if (v !== undefined) return v;
  }
  return undefined;
};

const draftRowSchema = z.object({
  text: z.string().trim().min(1, "question text is required").max(2000, "question text is too long"),
  optionA: z.string().trim().min(1, "optionA is required"),
  optionB: z.string().trim().min(1, "optionB is required"),
  optionC: z.string().trim().min(1, "optionC is required"),
  optionD: z.string().trim().min(1, "optionD is required"),
  correctOption: z.enum(["A", "B", "C", "D"], {
    message: "correctOption must be A, B, C, or D",
  }).optional(),
  explanation: z.string().optional(),
  imageUrl: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"], {
    message: "difficulty must be EASY, MEDIUM or HARD",
  }).optional(),
  marks: z.coerce.number().int("marks must be an integer").min(1, "marks must be at least 1").optional(),
  negMarks: z.coerce.number().min(0, "negMarks cannot be negative").optional(),
  chapterId: z.string().uuid("chapterId must be a valid uuid").optional(),
});

const REQUIRED_FIELDS = [
  ["text", "question text"],
  ["optionA", "optionA"],
  ["optionB", "optionB"],
  ["optionC", "optionC"],
  ["optionD", "optionD"],
];

/**
 * @param {string} csvText — raw file contents (UTF-8)
 * @param {{ maxRows?: number }} [opts]
 * @returns {{ rows: Array<object>, errors: Array<{ line: number, message: string }> }}
 * @throws {Error} on unparseable file or when the row-count cap is exceeded
 */
export function parseCsvToRows(csvText, { maxRows = 1000 } = {}) {
  let records;
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw new Error(`Could not parse CSV: ${err?.message ?? "unknown error"}`);
  }

  if (records.length > maxRows) {
    throw new Error(`Max ${maxRows} rows allowed per import (got ${records.length})`);
  }

  const rows = [];
  const errors = [];

  records.forEach((record, i) => {
    const line = i + 2; // the header row is line 1, so data starts at line 2
    const cell = {
      text: emptyToUndefined(record.text),
      optionA: emptyToUndefined(record.optionA),
      optionB: emptyToUndefined(record.optionB),
      optionC: emptyToUndefined(record.optionC),
      optionD: emptyToUndefined(record.optionD),
      correctOption: normalizeUpper(record.correctOption),
      explanation: emptyToUndefined(record.explanation),
      imageUrl: emptyToUndefined(record.imageUrl),
      difficulty: normalizeUpper(record.difficulty),
      marks: emptyToUndefined(record.marks),
      negMarks: pick(record, "negMarks", "negativeMarks"),
      chapterId: emptyToUndefined(record.chapterId),
    };

    // Required-field check first: undefined cells produce zod's generic
    // "expected string" noise, which hides WHICH column is wrong.
    const missing = REQUIRED_FIELDS.filter(([key]) => !cell[key]).map(([, label]) => label);
    if (missing.length > 0) {
      errors.push({ line, message: `${missing.join(", ")} is/are required` });
      return;
    }

    const parsed = draftRowSchema.safeParse(cell);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({ line, message: issue?.message ?? "invalid row" });
      return;
    }

    // `line` travels with the row so a downstream consumer (the bank import,
    // which commits rows immediately and must report the *original* line for
    // any row it rejects) never has to re-derive it from a filtered array.
    rows.push({ kind: "new", isReusable: false, line, ...parsed.data });
  });

  return { rows, errors };
}