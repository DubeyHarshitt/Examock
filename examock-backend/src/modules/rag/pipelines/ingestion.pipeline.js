import fs from "fs";
import pdfParse from "pdf-parse";
import { createChunkText } from "../ragUtils/chunker.js";
import { embedTexts } from "../ragUtils/embedder.js";
import { ensureCollection, storeChunks } from "../ragUtils/vectorStore.js";
import { AppError } from "../../../utils/AppError.js";

// metadata = { userId, fileName }         → student upload
// metadata = { examTypeId, fileName }     → admin note upload
// never pass both userId and examTypeId at the same time

export const ingestFile = async (filePath, metadata = {}) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);

    if (!parsed.text.trim()) {
      throw new AppError("PDF appears to be empty or unreadable.", 400);
    }

    const chunks = await createChunkText(parsed.text);
    const vectors = await embedTexts(chunks);

    await ensureCollection();
    await storeChunks(chunks, vectors, metadata);

    return {
      chunksStored: chunks.length,
    };
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};