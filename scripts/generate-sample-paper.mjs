#!/usr/bin/env node
/**
 * generate-sample-paper.mjs — regenerate the sample question paper PDF that the
 * test editor's "Import PDF" modal links to.
 *
 *   node scripts/generate-sample-paper.mjs
 *   → examock-frontend/public/samples/sample-question-paper.pdf
 *
 * WHY THIS EXISTS
 * The committed PDF is what ships; this script only rebuilds it. The editor's
 * "Import PDF" flow is a heuristic over `pdf-parse`'s flat text output, so the
 * sample has to be a *digital-text* PDF with a shape the parser recognises
 * (`pdfQuestionParser.js`): numbered questions `1.` / `Q1`, four options per
 * question marked `(a)`…`(d)` on their own lines, and nothing answer-key
 * related. One question references a figure on purpose, so the imported row
 * exercises the parser's `hadFigure` flag.
 *
 * The PDF stays in sync with `sample-questions.csv` (same five questions) so the
 * two example files describe the same paper.
 *
 * WHY cupsfilter AND NOT A HAND-ROLLED PDF
 * A minimal hand-written PDF (classic xref table) is rejected by the
 * `pdf-parse@1.1.4` bundled pdf.js with "bad XRef entry", while cupsfilter's
 * output parses cleanly. cupsfilter ships with macOS; if it is missing the
 * script stops rather than writing a broken file.
 *
 * NOTE ON VERIFYING
 * `pdf-parse@1.1.4` throws under Node 24 on any PDF; verify the generated file
 * by uploading it through the editor on Node 20.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "examock-frontend/public/samples/sample-question-paper.pdf");

// Keep ASCII-only: ligatures and non-ASCII glyphs extract as mojibake and break
// the parser's option markers. Five questions, four options each, one figure
// reference (question 3). Same paper as sample-questions.csv, no answer key.
const PAPER = [
  "EXAMOCK SAMPLE QUESTION PAPER",
  "Subject: Physics    Time: 30 minutes    Max Marks: 20",
  "Instructions: Choose the single best option for each question.",
  "",
  "1. A body moves 6 m north, then 8 m east. What is the magnitude of its displacement?",
  "(a) 10 m",
  "(b) 14 m",
  "(c) 2 m",
  "(d) 48 m",
  "",
  "2. The SI unit of force is the newton. Which physical quantity does it measure?",
  "(a) Energy",
  "(b) Mass",
  "(c) Force",
  "(d) Power",
  "",
  "3. Refer to the figure below showing a ray on a plane mirror. What is the angle of reflection if the angle of incidence is 30 degrees?",
  "(a) 15 degrees",
  "(b) 30 degrees",
  "(c) 60 degrees",
  "(d) 90 degrees",
  "",
  "4. Which of the following is a scalar quantity?",
  "(a) Velocity",
  "(b) Acceleration",
  "(c) Displacement",
  "(d) Speed",
  "",
  "5. A car accelerates uniformly from rest to 20 m/s in 5 s. What is its acceleration?",
  "(a) 2 m/s^2",
  "(b) 4 m/s^2",
  "(c) 5 m/s^2",
  "(d) 100 m/s^2",
  "",
];

const dir = mkdtempSync(join(tmpdir(), "examock-sample-"));
const src = join(dir, "sample-question-paper.txt");
writeFileSync(src, PAPER.join("\n"));

const res = spawnSync("cupsfilter", [src], { maxBuffer: 64 * 1024 * 1024 });
if (res.error || res.status !== 0 || !res.stdout?.length) {
  const why = res.error?.message ?? `exit ${res.status}`;
  console.error(`[sample-paper] cupsfilter failed (${why}).`);
  console.error("[sample-paper] cupsfilter is macOS-only; the committed PDF is still valid.");
  console.error(`[sample-paper] To regenerate, run this on macOS, or replace ${OUT} manually.`);
  process.exit(1);
}

writeFileSync(OUT, res.stdout);
console.log(`[sample-paper] wrote ${OUT} (${statSync(OUT).size} bytes)`);
console.log("[sample-paper] verify by uploading it via the editor's Import PDF on Node 20.");
