import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedQuery } from "../ragUtils/embedder.js";
import { searchSimilar } from "../ragUtils/vectorStore.js";
import { buildPrompt } from "../ragUtils/promptBuilder.js";
import config from "../../../config/config.js";
import prisma from "../../../config/prisma.js";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const answerQuestion = async (question, userId) => {
  // 1. Fetch the student's examTypeId so we can include admin notes in search
  let examTypeId = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { examTypeId: true },
    });
    examTypeId = user?.examTypeId || null;
  }

  // 2. Embed the question
  const queryVector = await embedQuery(question);

  // 3. Search — returns student's own docs + admin notes for their exam type
  const relevantChunks = await searchSimilar(queryVector, userId, examTypeId, 5);

  if (!relevantChunks.length) {
    return {
      answer:  "No study material found. Please upload a PDF or ask your admin to add notes.",
      sources: [],
    };
  }

  // 4. Build prompt + call Gemini
  const prompt = buildPrompt(question, relevantChunks);
  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return {
    answer,
    sources: [...new Set(relevantChunks.map((c) => c.fileName).filter(Boolean))],
  };
};