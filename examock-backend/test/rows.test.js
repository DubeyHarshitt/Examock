// test/rows.test.js — the paper-grid draft-row schema + dedup key (ticket 06)
import test from "node:test";
import assert from "node:assert/strict";
import {
  rowTextKey,
  rowSchema,
  rowsSchema,
  newRowSchema,
  refRowSchema,
  correctOptionSchema,
} from "../src/modules/admin/lib/rows.js";

const validNewRow = {
  kind: "new",
  chapterId: "ecfcaa14-8233-4a33-9696-5abdc11ef457",
  text: "  A particle is   projected   ",
  optionA: "2m",
  optionB: "4m",
  optionC: "6m",
  optionD: "8m",
  correctOption: "B",
  explanation: "basic kinematics",
  marks: 5,
  negMarks: 1,
  isReusable: false,
};

test("rowTextKey collapses whitespace and case-folds", () => {
  assert.equal(rowTextKey("  F = ma  "), "f = ma");
  assert.equal(rowTextKey("F=ma"), "f=ma");
  assert.equal(rowTextKey(undefined), "");
  assert.notEqual(rowTextKey("F = ma"), rowTextKey("F=ma"), "meaningful whitespace is kept");
});

test("newRowSchema accepts a full typed row", () => {
  const out = newRowSchema.parse(validNewRow);
  assert.equal(out.text, "A particle is   projected", "zod .trim() only trims ends");
  assert.equal(out.correctOption, "B");
  assert.equal(out.marks, 5);
});

test("newRowSchema rejects a bad correctOption", () => {
  const bad = { ...validNewRow, correctOption: "E" };
  assert.throws(() => newRowSchema.parse(bad), /correctOption/);
});

test("newRowSchema rejects missing options", () => {
  const bad = { ...validNewRow, optionC: "" };
  assert.throws(() => newRowSchema.parse(bad), /optionC/);
});

test("newRowSchema rejects a missing chapter", () => {
  const bad = { ...validNewRow, chapterId: "not-a-uuid" };
  assert.throws(() => newRowSchema.parse(bad), /chapterId/);
});

test("newRowSchema rejects empty question text", () => {
  const bad = { ...validNewRow, text: "   " };
  assert.throws(() => newRowSchema.parse(bad), /question text/);
});

test("newRowSchema rejects negative negMarks (it is a magnitude)", () => {
  const bad = { ...validNewRow, negMarks: -0.25 };
  assert.throws(() => newRowSchema.parse(bad), /negMarks/);
});

test("refRowSchema accepts a bank reference and rejects a bad questionId", () => {
  assert.equal(refRowSchema.parse({ kind: "ref", questionId: validNewRow.chapterId }).kind, "ref");
  assert.throws(() => refRowSchema.parse({ kind: "ref", questionId: "nope" }), /questionId/);
});

test("correctOptionSchema accepts only A-D", () => {
  assert.equal(correctOptionSchema.parse("A"), "A");
  assert.throws(() => correctOptionSchema.parse("a"));
  assert.throws(() => correctOptionSchema.parse("E"));
});

test("rowSchema is a discriminated union — unknown kinds are rejected", () => {
  assert.equal(rowSchema.parse(validNewRow).kind, "new");
  assert.equal(rowSchema.parse({ kind: "ref", questionId: validNewRow.chapterId }).kind, "ref");
  assert.throws(() => rowSchema.parse({ kind: "import", rows: [] }), /discriminator|kind/);
});

test("rowsSchema requires at least one row", () => {
  assert.equal(rowsSchema.parse([validNewRow]).length, 1);
  assert.throws(() => rowsSchema.parse([]), /non-empty array/);
});