import { GoogleGenAI } from "@google/genai";
import { embedQuery } from "../ragUtils/embedder.js";
import { searchSimilar } from "../ragUtils/vectorStore.js";
import { buildPrompt } from "../ragUtils/promptBuilder.js";
import config from "../../../config/config.js";
import prisma from "../../../config/prisma.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

export const answerQuestion = async (question, userId) => {
  // Get student's exam type
  let examTypeId = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { examTypeId: true },
    });

    examTypeId = user?.examTypeId || null;
  }

  // Generate query embedding
  const queryVector = await embedQuery(question);

  // Search Qdrant
  const relevantChunks = await searchSimilar(
    queryVector,
    userId,
    examTypeId,
    5
  );

  if (!relevantChunks.length) {
    return {
      answer:
        "No study material found. Please upload a PDF or ask your admin to add notes.",
      sources: [],
    };
  }

  // Build prompt
  const prompt = buildPrompt(question, relevantChunks);

  // Generate answer
  const response = await ai.models.generateContent({
    // gemini-2.5-flash was deprecated for new users; 3.x flash is the current line
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  return {
    answer: response.text,
    sources: [
      ...new Set(
        relevantChunks
          .map((chunk) => chunk.fileName)
          .filter(Boolean)
      ),
    ],
  };
};