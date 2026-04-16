
// ============================================================
// UPDATED test.controller.js
// ============================================================

export async function fetchQuestion(req, res, next) {
  try {
    const index = parseInt(req.query.index || "0");
    const attemptId = req.query.attemptId;

    if (!attemptId) {
      return res.status(400).json({ error: "attemptId required" });
    }

    const data = await getQuestion(req.user.userId, attemptId, index);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function answerQuestion(req, res, next) {
  try {
    const { attemptId, questionId, selectedOption } = req.body;

    const result = await saveAnswer(
      req.user.userId,
      attemptId,
      questionId,
      selectedOption
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitTestSession(req, res, next) {
  try {
    const { attemptId } = req.body;

    const result = await submitTest(req.user.userId, attemptId);

    res.json({ result });
  } catch (err) {
    next(err);
  }
}
