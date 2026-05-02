import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedQuery } from "../ragUtils/embedder.js";
import { searchSimilar } from "../ragUtils/vectorStore.js";
import { buildPrompt } from "../ragUtils/promptBuilder.js";
import config from "../../../config/config.js";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const answerQuestion = async (question, userId) => {
  // 1. EMBED the question
  const queryVector = await embedQuery(question);

  // 2. SEARCH Qdrant (filtered to this user's docs)
  const relevantChunks = await searchSimilar(queryVector, userId, 5);

  if (!relevantChunks.length) {
    return {
      answer: "No study material found.",
      sources: [],
    };
  }

  // 3. BUILD PROMPT
  const prompt = buildPrompt(question, relevantChunks);

  // 4. CALL GEMINI
  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return {
    answer,
    sources: [...new Set(relevantChunks.map((c) => c.fileName).filter(Boolean))],
  };
};