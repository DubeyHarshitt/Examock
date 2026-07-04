import { GoogleGenAI } from "@google/genai";
import config from "../../../config/config.js";
import { AppError } from "../../../utils/AppError.js";

const ai = new GoogleGenAI({
  apiKey: config.GEMINI_API_KEY,
});

export const embedTexts = async (texts) => {
  try {
    const vectors = [];

    for (const text of texts) {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });

      vectors.push(response.embeddings[0].values);
    }

    // console.log("Generated vectors:", vectors.length);
    // console.log("Vector dimension:", vectors[0].length);

    return vectors;
  } catch (err) {
    console.error(err);

    throw new AppError(
      "Failed to generate embeddings: " + err.message,
      500
    );
  }
};

export const embedQuery = async (query) => {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query,
    });

    return response.embeddings[0].values;
  } catch (err) {
    console.error(err);
    throw new AppError(
      "Failed to generate query embedding: " + err.message,
      500
    );
  }
};