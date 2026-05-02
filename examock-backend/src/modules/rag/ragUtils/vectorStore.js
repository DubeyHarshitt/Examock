import { QdrantClient } from "@qdrant/js-client-rest";
import config from "../../../config/config.js";
import { randomUUID } from "crypto";
import { AppError } from "../../../utils/AppError.js";

const client = new QdrantClient({
  url: config.QDRANT_URL,
  apiKey: config.QDRANT_API_KEY,
});

const COLLECTION = "study_docs";
const VECTOR_SIZE = 1536;

// Ensure collection exists
export const ensureCollection = async () => {
  try {
    const { collections } = await client.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    }
  } catch (err) {
    throw new AppError("Failed to initialize Qdrant collection", 500);
  }
};

// Store chunks
export const storeChunks = async (chunks, vectors, metadata = {}) => {
  if (!Array.isArray(chunks) || !Array.isArray(vectors)) {
    throw new AppError("Chunks and vectors must be arrays", 400);
  }

  if (chunks.length !== vectors.length) {
    throw new AppError("Chunks and vectors length mismatch", 400);
  }

  try {
    const points = chunks.map((text, i) => ({
      id: randomUUID(),
      vector: vectors[i],
      payload: {
        text,
        userId: metadata.userId || null,
        fileName: metadata.fileName || null,
      },
    }));

    await client.upsert(COLLECTION, { points });
  } catch (err) {
    throw new AppError("Failed to store embeddings in Qdrant", 500);
  }
};

// Search similar
export const searchSimilar = async (queryVector, userId, topK = 5) => {
  if (!Array.isArray(queryVector)) {
    throw new AppError("Query vector must be an array", 400);
  }

  try {
    const results = await client.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      filter: userId
        ? { must: [{ key: "userId", match: { value: userId } }] }
        : undefined,
    });

    return results.map((r) => ({
      text: r.payload.text,
      fileName: r.payload.fileName,
    }));
  } catch (err) {
    throw new AppError("Failed to search similar documents", 500);
  }
};