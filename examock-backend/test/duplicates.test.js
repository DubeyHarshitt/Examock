import test from "node:test";
import assert from "node:assert/strict";

import { findDuplicate, normalizeQuestionText } from "../src/modules/admin/lib/duplicates.js";

const existing = [
  { id: "q1", text: "What is the acceleration due to gravity?", topicId: "gravitation" },
  { id: "q2", text: "State Newton's second law.", topicId: "laws-of-motion" },
  { id: "q3", text: "What is the acceleration due to gravity?", topicId: "kinematics" },
];

test("matches exact text within the same chapter", () => {
  const found = findDuplicate(
    "What is the acceleration due to gravity?",
    "gravitation",
    existing,
  );
  assert.equal(found?.id, "q1");
});

test("the same text in a different chapter is not a duplicate", () => {
  const found = findDuplicate(
    "What is the acceleration due to gravity?",
    "mechanics", // no candidate lives here
    existing,
  );
  assert.equal(found, null);
});

test("the same chapter with different text is not a duplicate", () => {
  assert.equal(findDuplicate("Define momentum.", "gravitation", existing), null);
});

test("matching is case-sensitive — decided explicitly (ticket 01)", () => {
  assert.equal(
    findDuplicate("what is the acceleration due to gravity?", "gravitation", existing),
    null,
  );
});

test("whitespace differences do not defeat matching", () => {
  const found = findDuplicate(
    "  What   is the acceleration due to gravity?  ",
    "gravitation",
    existing,
  );
  assert.equal(found?.id, "q1");
});

test("an empty stem never matches (would reuse an arbitrary question)", () => {
  assert.equal(findDuplicate("", "gravitation", existing), null);
  assert.equal(findDuplicate("   ", "gravitation", existing), null);
  assert.equal(findDuplicate(null, "gravitation", existing), null);
});

test("no candidates → no duplicate", () => {
  assert.equal(findDuplicate("Anything at all?", "gravitation", []), null);
  assert.equal(findDuplicate("Anything at all?", "gravitation"), null);
});

test("chapterOf accepts both topicId and chapterId keys (draft rows)", () => {
  const drafts = [{ id: "d1", text: "Draft stem?", chapterId: "thermo" }];
  assert.equal(findDuplicate("Draft stem?", "thermo", drafts)?.id, "d1");
  assert.equal(findDuplicate("Draft stem?", "other", drafts), null);
});

test("a null chapter only matches other null-chapter candidates", () => {
  const noChapter = [{ id: "n1", text: "Orphan stem?", topicId: null }];
  assert.equal(findDuplicate("Orphan stem?", null, noChapter)?.id, "n1");
  assert.equal(findDuplicate("Orphan stem?", "gravitation", noChapter), null);
});

test("normalizeQuestionText collapses whitespace but preserves case", () => {
  assert.equal(normalizeQuestionText("  a   b \n c "), "a b c");
  assert.equal(normalizeQuestionText("Case Matters"), "Case Matters");
  assert.equal(normalizeQuestionText(undefined), "");
});
