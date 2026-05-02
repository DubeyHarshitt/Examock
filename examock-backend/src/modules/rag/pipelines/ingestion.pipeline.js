import fs from "fs"
import pdfParse from "pdf-parse"
import { createChunkText } from "../ragUtils/chunker.js"
import { embedTexts } from "../ragUtils/embedder.js"
import { ensureCollection, storeChunks } from "../ragUtils/vectorStore.js"
import { AppError } from "../../../utils/AppError.js"

export const ingestFile = async (filePath, userId, fileName) => {
  // 1. LOAD — parse PDF to raw text
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(buffer);
  const rawText = parsed.text;

  if (!rawText.trim()) {
    throw new AppError("PDF appears to be empty or unreadable.", 400);
  }

  // 2. CHUNK
  const chunks = await createChunkText(rawText);

  // 3. EMBED
  const vectors = await embedTexts(chunks);

  // 4. STORE
  await ensureCollection();
  await storeChunks(chunks, vectors, { userId, fileName });

  // Clean up the temp file multer saved
  fs.unlinkSync(filePath);

  return { chunksStored: chunks.length, fileName };
};