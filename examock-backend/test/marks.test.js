import test from "node:test";
import assert from "node:assert/strict";

import { reconcileMarks } from "../src/modules/admin/lib/marks.js";

const q = (marks) => ({ marks });

test("ok when the admin total equals the sum of per-question marks", () => {
  const questions = Array.from({ length: 144 }, () => q(5));
  const result = reconcileMarks(720, questions);
  assert.deepEqual(result, { ok: true, computed: 720, count: 144 });
});

test("not ok when the sum is short of the stated total", () => {
  const questions = Array.from({ length: 137 }, () => q(5));
  const result = reconcileMarks(720, questions);
  assert.deepEqual(result, { ok: false, computed: 685, count: 137 });
});

test("empty paper reconciles against a zero total", () => {
  assert.deepEqual(reconcileMarks(0, []), { ok: true, computed: 0, count: 0 });
});

test("empty paper does not reconcile against a non-zero total", () => {
  const result = reconcileMarks(720, []);
  assert.deepEqual(result, { ok: false, computed: 0, count: 0 });
});

test("zero-mark questions still count toward the question count", () => {
  const result = reconcileMarks(0, [q(0), q(0), q(0)]);
  assert.deepEqual(result, { ok: true, computed: 0, count: 3 });
});

test("mixed marks are summed", () => {
  const result = reconcileMarks(9, [q(4), q(4), q(1)]);
  assert.deepEqual(result, { ok: true, computed: 9, count: 3 });
});

test("missing or non-numeric marks are treated as zero, not as NaN", () => {
  const result = reconcileMarks(5, [q(4), { marks: "not a number" }, {}, null]);
  assert.deepEqual(result, { ok: false, computed: 4, count: 4 });
});

test("invalid marks never inflate the sum past valid entries", () => {
  const result = reconcileMarks(4, [q(4), { marks: "not a number" }, {}, null]);
  assert.deepEqual(result, { ok: true, computed: 4, count: 4 });
});

test("a missing questions array is treated as empty", () => {
  assert.deepEqual(reconcileMarks(0, undefined), { ok: true, computed: 0, count: 0 });
  assert.deepEqual(reconcileMarks(720, null), { ok: false, computed: 0, count: 0 });
});

test("a non-numeric total is never ok — a numeric string included", () => {
  assert.equal(reconcileMarks("720", [q(720)]).ok, false);
  assert.equal(reconcileMarks(undefined, []).ok, false);
});

test("marks survive float noise only when exactly equal", () => {
  assert.equal(reconcileMarks(2.5, [q(1.25), q(1.25)]).ok, true);
  assert.equal(reconcileMarks(2.5, [q(1.25), q(1.24)]).ok, false);
});
