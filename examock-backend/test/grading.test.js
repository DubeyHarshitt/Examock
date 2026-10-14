import test from "node:test";
import assert from "node:assert/strict";

import {
  gradeAttempt,
  toStudentQuestionResults,
} from "../src/modules/test/lib/grading.js";

// A test question row shaped like the one fetchTestQuestions() produces:
// { question: { ...SCORING_QUESTION_SELECT fields } }.
const tq = (id, correctOption, overrides = {}) => ({
  question: {
    id,
    topicId: `topic-${id}`,
    correctOption,
    marks: 4,
    negMarks: 1,
    explanation: `why ${id}`,
    text: `question ${id}`,
    imageUrl: null,
    optionA: "a",
    optionB: "b",
    optionC: "c",
    optionD: "d",
    ...overrides,
  },
});

test("all correct answers add marks and tally as correct", () => {
  const questions = [tq("q1", "A"), tq("q2", "B")];
  const { score, correct, incorrect, unattempted } = gradeAttempt(questions, {
    q1: "A",
    q2: "B",
  });
  assert.deepEqual({ score, correct, incorrect, unattempted }, {
    score: 8,
    correct: 2,
    incorrect: 0,
    unattempted: 0,
  });
});

test("wrong answers subtract negative marks and tally as incorrect", () => {
  const { score, correct, incorrect, unattempted } = gradeAttempt(
    [tq("q1", "A")],
    { q1: "C" },
  );
  assert.deepEqual({ score, correct, incorrect, unattempted }, {
    score: -1,
    correct: 0,
    incorrect: 1,
    unattempted: 0,
  });
});

test("missing answers count as unattempted and award no marks", () => {
  const { score, correct, incorrect, unattempted } = gradeAttempt(
    [tq("q1", "A"), tq("q2", "B")],
    { q1: "A" },
  );
  assert.deepEqual({ score, correct, incorrect, unattempted }, {
    score: 4,
    correct: 1,
    incorrect: 0,
    unattempted: 1,
  });
});

test("an empty or null answer is treated as unattempted, not incorrect", () => {
  for (const answers of [{ q1: null }, { q1: "" }, {}]) {
    const r = gradeAttempt([tq("q1", "A")], answers);
    assert.equal(r.unattempted, 1, JSON.stringify(answers));
    assert.equal(r.incorrect, 0, JSON.stringify(answers));
    assert.equal(r.score, 0, JSON.stringify(answers));
  }
});

test("a mixed paper nets correct and penalised marks", () => {
  const questions = [tq("q1", "A"), tq("q2", "B"), tq("q3", "C"), tq("q4", "D")];
  const { score, correct, incorrect, unattempted } = gradeAttempt(questions, {
    q1: "A", // +4
    q2: "A", // -1
    q3: "C", // +4
    // q4 unanswered
  });
  assert.deepEqual({ score, correct, incorrect, unattempted }, {
    score: 7,
    correct: 2,
    incorrect: 1,
    unattempted: 1,
  });
});

test("rows preserve paper order and carry options + the correct answer", () => {
  const questions = [tq("q1", "A"), tq("q2", "D"), tq("q3", "B")];
  const { rows } = gradeAttempt(questions, { q1: "A" });
  assert.deepEqual(
    rows.map((r) => r.questionId),
    ["q1", "q2", "q3"],
  );
  assert.deepEqual(rows[0].options, { A: "a", B: "b", C: "c", D: "d" });
  assert.equal(rows[1].correctOption, "D");
  assert.equal(rows[1].selected, null);
  assert.equal(rows[1].isCorrect, false);
  assert.equal(rows[1].marksAwarded, 0);
});

test("per-question marksAwarded is signed correctly", () => {
  const { rows } = gradeAttempt([tq("q1", "A"), tq("q2", "B")], {
    q1: "A",
    q2: "C",
  });
  assert.equal(rows[0].marksAwarded, 4);
  assert.equal(rows[1].marksAwarded, -1);
});

test("marks/negMarks are read per question, not assumed", () => {
  const questions = [
    tq("q1", "A", { marks: 2, negMarks: 0.5 }),
    tq("q2", "B", { marks: 2, negMarks: 0.5 }),
  ];
  const { score } = gradeAttempt(questions, { q1: "A", q2: "D" });
  assert.equal(score, 1.5);
});

test("the student shape hides the correct answer and the options", () => {
  const { rows } = gradeAttempt([tq("q1", "A")], { q1: "B" });
  const [student] = toStudentQuestionResults(rows);
  assert.deepEqual(student, {
    questionId: "q1",
    selected: "B",
    isCorrect: false,
    marksAwarded: -1,
    explanation: "why q1",
    text: "question q1",
    imageUrl: null,
  });
  assert.equal("correctOption" in student, false);
  assert.equal("options" in student, false);
  assert.equal("topicId" in student, false);
});

test("an empty paper yields zeroes, not NaN", () => {
  const r = gradeAttempt([], {});
  assert.deepEqual(
    { score: r.score, correct: r.correct, incorrect: r.incorrect, unattempted: r.unattempted },
    { score: 0, correct: 0, incorrect: 0, unattempted: 0 },
  );
  assert.deepEqual(r.rows, []);
});
