import test from "node:test";
import assert from "node:assert/strict";

import { mapSavedAnswers } from "../src/modules/test/lib/resumeAnswers.js";

const IDs = ["q-a", "q-b", "q-c", "q-d"];

test("no answers maps to an empty list", () => {
  assert.deepEqual(mapSavedAnswers({}, IDs), []);
});

test("a null answersJson maps to an empty list", () => {
  assert.deepEqual(mapSavedAnswers(null, IDs), []);
});

test("an undefined answersJson maps to an empty list", () => {
  assert.deepEqual(mapSavedAnswers(undefined, IDs), []);
});

test("an answer is reported with its position, not its raw id", () => {
  assert.deepEqual(mapSavedAnswers({ "q-b": "B" }, IDs), [
    { questionId: "q-b", questionIndex: 1, selectedOption: "B" },
  ]);
});

test("indices come from position in the ordered list, not from orderIndex", () => {
  // The first question sits at index 0 even though a 1-based orderIndex would
  // have called it 1 — getQuestion() walks by position.
  assert.deepEqual(mapSavedAnswers({ "q-a": "D" }, IDs), [
    { questionId: "q-a", questionIndex: 0, selectedOption: "D" },
  ]);
  assert.deepEqual(mapSavedAnswers({ "q-d": "A" }, IDs), [
    { questionId: "q-d", questionIndex: 3, selectedOption: "A" },
  ]);
});

test("cleared answers (null) are omitted", () => {
  assert.deepEqual(mapSavedAnswers({ "q-a": null, "q-b": "C" }, IDs), [
    { questionId: "q-b", questionIndex: 1, selectedOption: "C" },
  ]);
});

test("answers for questions no longer on the paper are dropped", () => {
  assert.deepEqual(mapSavedAnswers({ "q-ghost": "A", "q-c": "B" }, IDs), [
    { questionId: "q-c", questionIndex: 2, selectedOption: "B" },
  ]);
});

test("multiple answers are returned in ascending question order", () => {
  const result = mapSavedAnswers(
    { "q-d": "A", "q-a": "B", "q-c": "C" },
    IDs,
  );

  assert.deepEqual(result, [
    { questionId: "q-a", questionIndex: 0, selectedOption: "B" },
    { questionId: "q-c", questionIndex: 2, selectedOption: "C" },
    { questionId: "q-d", questionIndex: 3, selectedOption: "A" },
  ]);
});

test("every question answered yields one entry per question", () => {
  const result = mapSavedAnswers(
    { "q-a": "A", "q-b": "B", "q-c": "C", "q-d": "D" },
    IDs,
  );

  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((r) => r.questionIndex),
    [0, 1, 2, 3],
  );
});

test("a blank question list drops everything rather than inventing indices", () => {
  assert.deepEqual(mapSavedAnswers({ "q-a": "A" }, []), []);
});
