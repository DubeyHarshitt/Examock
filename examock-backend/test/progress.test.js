import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import { contributingChapters } from "../src/modules/admin/lib/progress.js";

test("returns the distinct chapters of the questions in the test", () => {
  const questions = [
    { topicId: "kinematics" },
    { topicId: "laws-of-motion" },
    { topicId: "kinematics" },
  ];
  assert.deepEqual(contributingChapters(questions), ["kinematics", "laws-of-motion"]);
});

test("null, undefined and empty-string chapters are filtered out", () => {
  const questions = [
    { topicId: null },
    { topicId: undefined },
    { topicId: "" },
    { topicId: "gravitation" },
    {},
  ];
  assert.deepEqual(contributingChapters(questions), ["gravitation"]);
});

test("an empty attempt contributes no chapters", () => {
  assert.deepEqual(contributingChapters([]), []);
});

test("a null/undefined questions array contributes no chapters", () => {
  assert.deepEqual(contributingChapters(null), []);
  assert.deepEqual(contributingChapters(undefined), []);
});

test("order-independent: any permutation yields the same array", () => {
  const ids = ["c", "a", "b", "a", "d"];
  const questions = ids.map((topicId) => ({ topicId }));
  const expected = contributingChapters(questions);

  const shuffled = [...questions].reverse();
  assert.deepEqual(contributingChapters(shuffled), expected);
  assert.deepEqual(expected, ["a", "b", "c", "d"]);
});

test("property: the result is exactly the set of non-empty topicIds", () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          topicId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
        }),
        { maxLength: 50 },
      ),
      (questions) => {
        const result = contributingChapters(questions);
        const wanted = [...new Set(questions.map((q) => q.topicId).filter(Boolean))].sort();
        assert.deepEqual(result, wanted);
        // no duplicates, ever
        assert.equal(new Set(result).size, result.length);
      },
    ),
  );
});

test("property: shuffling the questions never changes the result (fast-check)", () => {
  const rotate = (arr, n) => arr.slice(n).concat(arr.slice(0, n));
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 30 }),
      (topicIds) => {
        const questions = topicIds.map((topicId) => ({ topicId }));
        const variants = [
          [...questions].reverse(),
          rotate(questions, 1),
          questions.slice().sort((a, b) => a.topicId.localeCompare(b.topicId)),
        ];
        for (const variant of variants) {
          assert.deepEqual(
            contributingChapters(variant),
            contributingChapters(questions),
          );
        }
      },
    ),
  );
});
