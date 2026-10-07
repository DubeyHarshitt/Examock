/**
 * Paper-grid rows (ticket 06) — the shared draft-row contract.
 *
 * The grid, the add-from-bank dialog, and the future CSV / PDF ingestors
 * (tickets 08 / 09) all speak this one discriminated union:
 *
 *   { kind: "new", chapterId, text, optionA..D, correctOption, explanation?,
 *     imageUrl?, isReusable?, marks?, negMarks?, difficulty? }
 *   { kind: "ref", questionId }
 *
 * `new` rows create questions (or reuse a same-chapter exact-text match,
 * decision Q18); `ref` rows link existing bank questions by id. Persisting is
 * atomic — see `persistRows` in admin.service.js.
 *
 * Design: docs/admin-pannel/ticket/06-paper-grid.md
 * Covered by test/rows.test.js.
 */
import { z } from "zod";

export const CORRECT_OPTIONS = ["A", "B", "C", "D"];

/**
 * Canonical key for exact-text duplicate matching (Q18). Inserts are
 * trimmed and whitespace-collapsed; the key is case-folded so "F = ma" and
 * "f = ma" are the same question, but "F = ma" and "F=ma" are not.
 *
 * @param {string | undefined} text
 * @returns {string}
 */
export function rowTextKey(text) {
  return (text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export const correctOptionSchema = z.enum(CORRECT_OPTIONS, {
  errorMap: () => ({ message: "correctOption must be A, B, C, or D" }),
});

export const newRowSchema = z.object({
  kind: z.literal("new"),
  chapterId: z.string().uuid("chapterId must be a valid uuid"),
  text: z.string().trim().min(1, "question text is required").max(2000, "question text is too long"),
  optionA: z.string().trim().min(1, "optionA is required"),
  optionB: z.string().trim().min(1, "optionB is required"),
  optionC: z.string().trim().min(1, "optionC is required"),
  optionD: z.string().trim().min(1, "optionD is required"),
  correctOption: correctOptionSchema,
  explanation: z.string().optional(),
  // Accepted now so drafts already carry the slot; upload UI lands in ticket 07.
  imageUrl: z.string().nullable().optional(),
  // Q16: hand-typed rows default reusable; pasted/imported rows send false.
  isReusable: z.boolean().optional(),
  marks: z.coerce.number().int("marks must be an integer").min(1, "marks must be at least 1").optional(),
  negMarks: z.coerce.number().min(0, "negMarks cannot be negative").optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});

export const refRowSchema = z.object({
  kind: z.literal("ref"),
  questionId: z.string().uuid("questionId must be a valid uuid"),
});

export const rowSchema = z.discriminatedUnion("kind", [newRowSchema, refRowSchema]);

export const rowsSchema = z.array(rowSchema).min(1, "rows must be a non-empty array");