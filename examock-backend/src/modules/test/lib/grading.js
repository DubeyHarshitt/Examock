// examock-backend/src/modules/test/lib/grading.js
//
// Pure grading logic — no DB, no I/O. Kept separate from ./scoring.js (which
// fetches the questions) so it can be unit-tested without a database and reused
// by both the student result paths and the admin attempt-breakdown view, so the
// two can never disagree about what "correct" means.

// Fields needed to grade (`correctOption`, `marks`, `negMarks`) and to render a
// review (`text`, `imageUrl`, `explanation`, and the four options).
export const SCORING_QUESTION_SELECT = {
  id: true,
  topicId: true,
  correctOption: true,
  marks: true,
  negMarks: true,
  explanation: true,
  text: true,
  imageUrl: true,
  optionA: true,
  optionB: true,
  optionC: true,
  optionD: true,
};

// Ordered test questions + a student's { questionId: "A"|"B"|"C"|"D" } answer
// map → per-question rich rows, a score, and the correct/incorrect/unattempted
// tallies. A missing or empty answer for a question counts as unattempted.
export function gradeAttempt(testQuestions, userAnswers) {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;

  const rows = testQuestions.map(({ question }) => {
    const selected = userAnswers[question.id] ?? null;

    const base = {
      questionId: question.id,
      topicId: question.topicId,
      text: question.text,
      imageUrl: question.imageUrl,
      explanation: question.explanation,
      options: {
        A: question.optionA,
        B: question.optionB,
        C: question.optionC,
        D: question.optionD,
      },
      correctOption: question.correctOption,
      marks: question.marks,
      negMarks: question.negMarks,
      selected,
    };

    if (!selected) {
      unattempted++;
      return { ...base, isCorrect: false, marksAwarded: 0 };
    }
    if (selected === question.correctOption) {
      correct++;
      score += question.marks;
      return { ...base, isCorrect: true, marksAwarded: question.marks };
    }
    incorrect++;
    score -= question.negMarks;
    return { ...base, isCorrect: false, marksAwarded: -question.negMarks };
  });

  return { rows, score, correct, incorrect, unattempted };
}

// The student-facing review shape — carries what the student picked, the
// correct option, and the four option texts so the post-test review can show
// the full question. topicId stays out (internal to fan-out, not a review need).
export function toStudentQuestionResults(rows) {
  return rows.map((r) => ({
    questionId: r.questionId,
    selected: r.selected,
    correctOption: r.correctOption,
    options: r.options,
    isCorrect: r.isCorrect,
    marksAwarded: r.marksAwarded,
    explanation: r.explanation,
    text: r.text,
    imageUrl: r.imageUrl,
  }));
}
