import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import {
  normaliseText,
  splitQuestionBlocks,
  parseQuestionBlocks,
  PARSE_OK,
  PARSE_REVIEW,
} from "../src/modules/admin/lib/pdfQuestionParser.js";

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

test("normalise collapses horizontal whitespace and trims lines", () => {
  assert.equal(normaliseText("  a \t b  \n  c  "), "a b\nc");
});

test("normalise joins hyphenated line breaks", () => {
  assert.equal(normaliseText("the phy-\nsical world"), "the physical world");
});

test("normalise converts ligatures via NFKC", () => {
  assert.equal(normaliseText("e\uFB03cient method"), "efficient method"); // ﬃ → ffi
  assert.equal(normaliseText("e\uFB01cient method"), "eficient method"); // ﬁ → fi
});

test("normalise strips repeated digit-carrying headers/footers", () => {
  const header = "JEE Main 2025 - Page";
  const text = [header, "1. Q one (a) 1 (b) 2 (c) 3 (d) 4", header, header].join("\n");
  assert.ok(!normaliseText(text).includes(header));
});

test("normalise keeps repeated lines that look like options (no digit header pattern)", () => {
  const option = "None of these";
  const text = [option, "1. Q one (a) 1 (b) 2 (c) 3 (d) 4", option, option].join("\n");
  assert.ok(normaliseText(text).includes(option));
});

test("normalise tolerates null/undefined", () => {
  assert.equal(normaliseText(null), "");
  assert.equal(normaliseText(undefined), "");
});

// ---------------------------------------------------------------------------
// Boundary detection — the core of ticket 01's parser coverage
// ---------------------------------------------------------------------------

test("splits on numeric boundaries: '1.' and '1)'", () => {
  const text = [
    "1) First question?",
    "(a) one (b) two (c) three (d) four",
    "2) Second question?",
    "(a) one (b) two (c) three (d) four",
  ].join("\n");
  const blocks = splitQuestionBlocks(text);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map((b) => b.number), [1, 2]);
});

test("splits on Q-form boundaries: Q1, Q.1, Question 1.", () => {
  for (const line of ["Q1. First?", "Q.1 First?", "Q1 First?", "Question 1. First?"]) {
    const blocks = splitQuestionBlocks(`${line}\n(a) x (b) y (c) z (d) w`);
    assert.equal(blocks.length, 1, `expected 1 block for ${JSON.stringify(line)}`);
  }
});

test("numbered options are not misread as question boundaries", () => {
  const text = [
    "1. What is 2+2?",
    "1. 3",
    "2. 4",
    "3. 5",
    "4. 6",
    "2. What is 3+3?",
    "1. 5",
    "2. 6",
    "3. 7",
    "4. 8",
  ].join("\n");
  const blocks = splitQuestionBlocks(text);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks.map((b) => b.number), [1, 2]);
});

test("numbering restarts per subject are detected as boundaries", () => {
  const q = (n, stem) =>
    [`${n}. ${stem}`, "(a) one (b) two (c) three (d) four"].join("\n");
  const text = [q(1, "First paper one?"), q(2, "Second paper one?"), q(1, "First paper two?")].join("\n");
  const blocks = splitQuestionBlocks(text);
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map((b) => b.number), [1, 2, 1]);
});

test("text before the first question is preamble, not a block", () => {
  const text = [
    "JEE Main 2025 - Physics",
    "Time: 3 hours. Read instructions carefully.",
    "1. Real question?",
    "(a) one (b) two (c) three (d) four",
  ].join("\n");
  const blocks = splitQuestionBlocks(text);
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].lines[0].startsWith("1."));
});

test("continuation lines stay inside their block", () => {
  const text = [
    "1. A stem that wraps",
    "onto a second line?",
    "(a) one (b) two (c) three (d) four",
    "2. Next?",
    "(a) one (b) two (c) three (d) four",
  ].join("\n");
  const blocks = splitQuestionBlocks(text);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].lines.length, 3);
});

test("a year or number not followed by ./) is not a boundary", () => {
  const text = ["1. First?", "(a) 1 (b) 2 (c) 3 (d) 4", "In 1947 the answer", "was 42."].join("\n");
  assert.equal(splitQuestionBlocks(text).length, 1);
});

// ---------------------------------------------------------------------------
// Row assembly
// ---------------------------------------------------------------------------

test("emits an OK row for a clean question with 4 options", () => {
  const rows = parseQuestionBlocks(
    "1. What is 2+2?\n(a) 3 (b) 4 (c) 5 (d) 6",
  );
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.kind, "new");
  assert.equal(row.text, "What is 2+2?");
  assert.deepEqual(
    [row.optionA, row.optionB, row.optionC, row.optionD],
    ["3", "4", "5", "6"],
  );
  assert.equal(row.correctOption, null); // never extracted (Q22)
  assert.equal(row.parseStatus, PARSE_OK);
  assert.equal(row.parseError, null);
});

test("options on their own lines are paired with the stem", () => {
  const rows = parseQuestionBlocks(
    ["1. Pick one.", "(a) one", "(b) two", "(c) three", "(d) four"].join("\n"),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parseStatus, PARSE_OK);
  assert.deepEqual(
    [rows[0].optionA, rows[0].optionB, rows[0].optionC, rows[0].optionD],
    ["one", "two", "three", "four"],
  );
});

test("a row with 3 options is flagged, not dropped", () => {
  const rows = parseQuestionBlocks("1. Broken?\n(a) one (b) two (c) three");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parseStatus, PARSE_REVIEW);
  assert.equal(rows[0].parseError, "found 3 options, expected 4");
  assert.equal(rows[0].text, "Broken?"); // partial rows are kept (Q25)
});

test("wrapped option text is concatenated into its option", () => {
  const rows = parseQuestionBlocks(
    ["1. Long options?", "(a) one that is long", "and wraps over lines", "(b) two (c) three (d) four"].join("\n"),
  );
  assert.equal(rows[0].optionA, "one that is long and wraps over lines");
  assert.equal(rows[0].parseStatus, PARSE_OK);
});

test("text with no question boundary at all becomes one flagged row", () => {
  const rows = parseQuestionBlocks("Just some prose with no numbering at all.");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parseStatus, PARSE_REVIEW);
  assert.equal(rows[0].parseError, "found 0 options, expected 4");
  assert.ok(rows[0].text.includes("prose"));
});

test("empty or whitespace-only input parses to no rows", () => {
  assert.deepEqual(parseQuestionBlocks(""), []);
  assert.deepEqual(parseQuestionBlocks("   \n \n"), []);
  assert.deepEqual(parseQuestionBlocks(null), []);
});

// ---------------------------------------------------------------------------
// hadFigure heuristics (figures are never extracted — Q32)
// ---------------------------------------------------------------------------

test("a figure reference flags hadFigure", () => {
  const rows = parseQuestionBlocks(
    "1. Refer to the figure. What is x?\n(a) 1 (b) 2 (c) 3 (d) 4",
  );
  assert.equal(rows[0].hadFigure, true);
});

test("an unusually short stem flags hadFigure", () => {
  const rows = parseQuestionBlocks("1. x = ?\n(a) 1 (b) 2 (c) 3 (d) 4");
  assert.equal(rows[0].hadFigure, true);
});

test("a normal stem does not flag hadFigure", () => {
  const rows = parseQuestionBlocks(
    "1. A sufficiently long and ordinary question stem about physics.\n(a) 1 (b) 2 (c) 3 (d) 4",
  );
  assert.equal(rows[0].hadFigure, false);
});

// ---------------------------------------------------------------------------
// Property tests (fast-check — noted in ticket 01)
// ---------------------------------------------------------------------------

test("property: round-trip — formatted questions parse back exactly", () => {
  const word = fc.stringMatching(/^[a-z]{1,8}( [a-z]{1,8}){0,4}$/); // no parens, no digits, no newlines
  const questionArb = fc.record({ text: word, a: word, b: word, c: word, d: word });

  fc.assert(
    fc.property(fc.array(questionArb, { minLength: 1, maxLength: 12 }), (questions) => {
      const paper = questions
        .map((q, i) => `${i + 1}. ${q.text} (a) ${q.a} (b) ${q.b} (c) ${q.c} (d) ${q.d}`)
        .join("\n");

      const rows = parseQuestionBlocks(paper);
      assert.equal(rows.length, questions.length);
      rows.forEach((row, i) => {
        assert.equal(row.parseStatus, PARSE_OK, `row ${i}: ${row.parseError}`);
        assert.equal(row.text, questions[i].text);
        assert.equal(row.optionA, questions[i].a);
        assert.equal(row.optionB, questions[i].b);
        assert.equal(row.optionC, questions[i].c);
        assert.equal(row.optionD, questions[i].d);
        assert.equal(row.correctOption, null);
      });
    }),
  );
});

test("property: the parser never throws on arbitrary text (fast-check)", () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 500 }), (text) => {
      const rows = parseQuestionBlocks(text);
      assert.ok(Array.isArray(rows));
      for (const row of rows) {
        assert.ok([PARSE_OK, PARSE_REVIEW].includes(row.parseStatus));
        assert.equal(typeof row.text, "string");
        assert.equal(row.correctOption, null);
      }
    }),
  );
});
