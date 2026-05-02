import { ingestFile } from "./pipelines/ingestion.pipeline.js";
import { answerQuestion } from "./pipelines/retrieval.pipeline.js";

// Ingest (Adding Data to vector db)
export const handleIngest = async (req, res, next) => {
  try {
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const userId = req.user?.id || null; // from your auth middleware

    const result = await ingestFile(filePath, userId, fileName);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const handleChat = async (req, res, next) => {
  try {
    const { question } = req.body;
    const userId = req.user?.id || null;

    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const result = await answerQuestion(question, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
