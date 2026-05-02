import { OpenAIEmbeddings } from "@langchain/openai";
import config from "../../../config/config.js";
import { AppError } from "../../../utils/AppError.js";

const embedder = new OpenAIEmbeddings({
  openAIApiKey: config.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

export const embedTexts = async (texts) => {
  if (!Array.isArray(texts)) {
    throw new AppError("embedTexts expects an array of strings", 400);
  }

  try {
    return await embedder.embedDocuments(texts);
  } catch (err) {
    throw new AppError("Failed to generate embeddings for documents", 500);
  }
};

export const embedQuery = async (query) => {
  if (typeof query !== "string") {
    throw new AppError("embedQuery expects a string", 400);
  }

  try {
    return await embedder.embedQuery(query);
  } catch (err) {
    throw new AppError("Failed to generate embedding for query", 500);
  }
};