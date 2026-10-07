import test from "node:test";
import assert from "node:assert/strict";

import { deriveScope, SCOPE } from "../src/modules/admin/lib/scope.js";

test("subjectId null means the whole exam", () => {
  assert.equal(deriveScope(null), SCOPE.EXAM);
});

test("subjectId undefined means the whole exam", () => {
  assert.equal(deriveScope(undefined), SCOPE.EXAM);
});

test("an empty string is treated as no subject", () => {
  assert.equal(deriveScope(""), SCOPE.EXAM);
});

test("a set subjectId means one subject", () => {
  assert.equal(deriveScope("3f1d3f0e-0000-4000-8000-000000000001"), SCOPE.SUBJECT);
});

test("any non-empty string counts as a subject — including whitespace", () => {
  assert.equal(deriveScope(" "), SCOPE.SUBJECT);
});

test("SCOPE values are exactly EXAM and SUBJECT", () => {
  assert.deepEqual(Object.values(SCOPE).sort(), ["EXAM", "SUBJECT"]);
});
