import { QdrantClient } from "@qdrant/js-client-rest";
import config from "../../../config/config.js";
import { randomUUID } from "crypto";
import { AppError } from "../../../utils/AppError.js";

const client = new QdrantClient({
  url: config.QDRANT_URL,
  apiKey: config.QDRANT_API_KEY,
});

const COLLECTION = "study_docs";
const VECTOR_SIZE = 3072;

export const ensureCollection = async () => {
  // await client.deleteCollection("study_docs");
  try {
    const { collections } = await client.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION);
    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
    }
    // Payload indexes are REQUIRED for filtered searches when Qdrant strict mode
    // is enabled (the default on cloud + dev). Without them, queries that filter
    // on userId/examTypeId are rejected with "Index required but not found".
    await client.createPayloadIndex(COLLECTION, {
      field_name: "userId",
      field_schema: "keyword",
    });
    await client.createPayloadIndex(COLLECTION, {
      field_name: "examTypeId",
      field_schema: "keyword",
    });
  } catch (err) {
    throw new AppError(
      "Failed to initialize Qdrant collection : " + err.message,
      500,
    );
  }
};

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
        userId: metadata.userId || null, // student upload
        examTypeId: metadata.examTypeId || null, // admin upload
        fileName: metadata.fileName || null,
      },
    }));

    // console.log("Vector length:", vectors[0].length);
    // console.log("Chunks:", chunks.length);

    await client.upsert(COLLECTION, { points });
  } catch (err) {
    console.error("Qdrant Error:", err);

    if (err.response) {
      console.error(err.response.data);
    }

    throw err;
  }
};

// userId      = the student's own uploaded notes
// examTypeId  = admin notes shared with all students of that exam type
// Both are searched together so student sees everything relevant
export const searchSimilar = async (
  queryVector,
  userId,
  examTypeId,
  topK = 5,
) => {
  if (!Array.isArray(queryVector)) {
    throw new AppError("Query vector must be an array", 400);
  }

  // Build filter: match student's own docs OR admin docs for their exam type
  const shouldConditions = [];

  if (userId) {
    shouldConditions.push({ key: "userId", match: { value: userId } });
  }
  if (examTypeId) {
    shouldConditions.push({ key: "examTypeId", match: { value: examTypeId } });
  }

  const filter =
    shouldConditions.length > 0 ? { should: shouldConditions } : undefined;

  try {
    const results = await client.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      filter,
    });

    return results.map((r) => ({
      text: r.payload.text,
      fileName: r.payload.fileName,
    }));
  } catch (err) {
    throw new AppError("Failed to search similar documents", 500);
  }
};
