import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AppError } from "../../../utils/AppError.js";

export const createChunkText = async (text) => {
  if (typeof text !== "string" || !text.trim()) {
    throw new AppError("createChunkText expects a non-empty string", 400);
  }

  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const docs = await splitter.createDocuments([text]);

    return docs.map((doc) => doc.pageContent);
  } catch (err) {
    throw new AppError("Failed to split text into chunks", 500);
  }
};