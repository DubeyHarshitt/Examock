// examock-backend/src/modules/test/lib/scoring.js
//
// DB-backed half of grading: fetches the test's questions with the fields the
// grader needs. The pure grading lives in ./grading.js and is re-exported here
// so callers have a single import surface.

import prisma from "../../../config/prisma.js";
import { SCORING_QUESTION_SELECT } from "./grading.js";

export {
  SCORING_QUESTION_SELECT,
  gradeAttempt,
  toStudentQuestionResults,
} from "./grading.js";

// The test's questions in paper order, each with the grading fields attached.
export function fetchTestQuestions(mockTestId) {
  return prisma.testQuestion.findMany({
    where: { testId: mockTestId },
    orderBy: { orderIndex: "asc" },
    include: { question: { select: SCORING_QUESTION_SELECT } },
  });
}
