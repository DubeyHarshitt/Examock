import {
  getTests,
  getTestById,
  startTest,
  getQuestion,
  saveAnswer,
  submitTest,
  getResult,
} from "./test.service.js";

// ─────────────────────────────────────────────────────────────
// GET /tests
// ─────────────────────────────────────────────────────────────

export async function listTests(req, res, next) {
  try {
    const tests = await getTests(req.user.userId);
    res.json({ tests });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /tests/:id
// ─────────────────────────────────────────────────────────────

export async function getTest(req, res, next) {
  try {
    const test = await getTestById(req.params.id, req.user.userId);
    res.json({ test });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /tests/:id/start
// :id = testId
// Returns attemptId — frontend must store this for all subsequent calls
// ─────────────────────────────────────────────────────────────

export async function startTestSession(req, res, next) {
  try {
    const session = await startTest(req.user.userId, req.params.id);
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /tests/:id/question?index=0&attemptId=uuid
// :id = testId (for route consistency)
// attemptId comes from query — returned by startTest
// ─────────────────────────────────────────────────────────────

export async function fetchQuestion(req, res, next) {
  try {
    const { attemptId, index } = req.query;

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const questionIndex = parseInt(index ?? "0");
    if (isNaN(questionIndex)) {
      return res.status(400).json({ error: "index must be a number" });
    }

    const result = await getQuestion(req.user.userId, attemptId, questionIndex);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /tests/:id/answer
// attemptId comes from req.body
// ─────────────────────────────────────────────────────────────

export async function answerQuestion(req, res, next) {
  try {
    const result = await saveAnswer(
      req.user.userId,
      req.body.attemptId,       // ✅ from body not req.params.id
      req.body.questionId,
      req.body.selectedOption
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /tests/:id/submit
// attemptId comes from req.body
// ─────────────────────────────────────────────────────────────

export async function submitTestSession(req, res, next) {
  try {
    const attemptId = req.body.attemptId;

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const result = await submitTest(req.user.userId, attemptId);
    res.json({ result });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /tests/:id/result?attemptId=uuid
// ─────────────────────────────────────────────────────────────

export async function fetchResult(req, res, next) {
  try {
    const { attemptId } = req.query;

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId is required" });
    }

    const result = await getResult(req.user.userId, attemptId);
    res.json({ result });
  } catch (err) {
    next(err);
  }
}