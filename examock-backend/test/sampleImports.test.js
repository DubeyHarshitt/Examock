// test/sampleImports.test.js — guard the shipped sample files against drift.
//
// The test editor links admins to `frontend/public/samples/sample-questions.csv`
// and `sample-question-paper.pdf` as worked examples. If the parser contract
// changes and the samples are not updated, the example admins are told to copy
// stops importing cleanly. This pins the CSV sample only: the PDF sample needs
// `pdf-parse`, which throws under Node 24 (verify it by hand on Node 20).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsvToRows } from "../src/modules/admin/lib/csvRows.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = join(ROOT, "examock-frontend/public/samples/sample-questions.csv");

test("the sample CSV imports with zero errors", () => {
  const { rows, errors } = parseCsvToRows(readFileSync(CSV, "utf8"));
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 4);
  // Every row is a draft (never reusable) and carries its source line.
  for (const row of rows) {
    assert.equal(row.kind, "new");
    assert.equal(row.isReusable, false);
  }
});

test("the sample CSV demonstrates an unticked row (no correctOption)", () => {
  const { rows } = parseCsvToRows(readFileSync(CSV, "utf8"));
  assert.ok(
    rows.some((r) => r.correctOption === undefined),
    "one row should omit correctOption to show the unticked-until-reviewed behaviour",
  );
});
