// test/csvRows.test.js — the CSV ingestion parser (ticket 08)
import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvToRows } from "../src/modules/admin/lib/csvRows.js";

const HEADER =
  "text,optionA,optionB,optionC,optionD,correctOption,explanation,imageUrl,difficulty,marks,negativeMarks,chapterId";

test("imports quoted commas/newlines inside a field (the ticket verify case)", () => {
  const { rows, errors } = parseCsvToRows(`${HEADER}\n"What is 2+2, exactly?",3,4,5,6,B`);
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, "What is 2+2, exactly?");
  assert.equal(rows[0].correctOption, "B");
});

test("columns work in any order (header-driven)", () => {
  const { rows, errors } = parseCsvToRows(
    "correctOption,optionA,optionB,optionC,optionD,text\nD,w,x,y,z,Hooke's law?",
  );
  assert.equal(errors.length, 0);
  assert.equal(rows[0].text, "Hooke's law?");
  assert.equal(rows[0].correctOption, "D");
});

test("good rows survive a malformed row, each reported with its line number", () => {
  const { rows, errors } = parseCsvToRows(
    `${HEADER}\n"2+2, exactly?",3,4,5,6,B\nbroken,only-one-field,,,,`,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, "2+2, exactly?");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 3); // header = line 1, first data row = 2, broken = 3
  assert.match(errors[0].message, /option/);
});

test("every valid row carries its source line (bank import reports it verbatim)", () => {
  // The bank import commits rows immediately and rejects those without a
  // correctOption; it must name the *original* line, so the parser attaches it.
  const { rows } = parseCsvToRows(
    `${HEADER}\nq1,a,b,c,d,B,,,hard,1,0,\nq2,a,b,c,d,B,,,easy,1,0,`,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].line, 2); // header = line 1
  assert.equal(rows[1].line, 3);
});

test("invalid correctOption is a per-row error, never corrected or inferred", () => {
  const { rows, errors } = parseCsvToRows(`${HEADER}\nq,a,b,c,d,Z`);
  assert.equal(rows.length, 0);
  assert.equal(errors[0].line, 2);
  assert.match(errors[0].message, /must be A, B, C/);
});

test("a row without correctOption is imported unticked — never inferred", () => {
  const { rows, errors } = parseCsvToRows(`${HEADER}\nq,a,b,c,d,,,`);
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].correctOption, undefined);
});

test("imported rows are always isReusable:false (past papers are not practice items)", () => {
  const { rows } = parseCsvToRows(`${HEADER}\nq,a,b,c,d,B,,,,,`);
  assert.equal(rows[0].isReusable, false);
});

test("negativeMarks maps to negMarks and coerces", () => {
  const { rows, errors } = parseCsvToRows(`${HEADER}\nq,a,b,c,d,B,,,,"4","1.5",`);
  assert.equal(errors.length, 0);
  assert.equal(rows[0].negMarks, 1.5);
  assert.equal(rows[0].marks, 4);
});

test("marks/negMarks/difficulty uppercase-normalize and empty cells stay undefined", () => {
  const { rows } = parseCsvToRows(`${HEADER}\nq,a,b,c,d,B,,,hard,3,0,`);
  assert.equal(rows[0].difficulty, "HARD");
  assert.equal(rows[0].marks, 3);
  assert.equal(rows[0].negMarks, 0);
  assert.equal(rows[0].chapterId, undefined);
  assert.equal(rows[0].explanation, undefined);
});

test("optional chapterId validates UUID when present", () => {
  const good = parseCsvToRows(
    `${HEADER}\nq,a,b,c,d,B,,,,,,ecfcaa14-8233-4a33-9696-5abdc11ef457`,
  );
  assert.equal(good.rows[0].chapterId, "ecfcaa14-8233-4a33-9696-5abdc11ef457");
  assert.equal(good.errors.length, 0);

  const bad = parseCsvToRows(`${HEADER}\nq,a,b,c,d,B,,,,,,not-a-uuid`);
  assert.equal(bad.rows.length, 0);
  assert.match(bad.errors[0].message, /uuid/);
});

test("row-count cap throws", () => {
  const csv = `${HEADER}\n` + Array.from({ length: 3 }, () => "q,a,b,c,d,B").join("\n");
  assert.throws(() => parseCsvToRows(csv, { maxRows: 2 }), /Max 2 rows/);
});

test("unparseable content throws a useful error", () => {
  assert.throws(() => parseCsvToRows('"unterminated'), /Could not parse CSV/);
});

test("empty file yields no rows and no errors", () => {
  const { rows, errors } = parseCsvToRows("");
  assert.equal(rows.length, 0);
  assert.equal(errors.length, 0);
});