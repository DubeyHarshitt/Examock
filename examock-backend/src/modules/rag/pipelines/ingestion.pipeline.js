import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import pdfParse from "pdf-parse";
import { createChunkText } from "../ragUtils/chunker.js";
import { embedTexts } from "../ragUtils/embedder.js";
import { ensureCollection, storeChunks } from "../ragUtils/vectorStore.js";
import { AppError } from "../../../utils/AppError.js";

// metadata = { userId, fileName }         → student upload
// metadata = { examTypeId, fileName }     → admin note upload
// never pass both userId and examTypeId at the same time

const REMOTE_URL = /^https?:\/\//i;

/**
 * Resolve a file reference to a local path on disk.
 * Admin notes are stored on Cloudinary (`filePath` = secure_url), while student
 * uploads pass a multer temp path — this handles both.
 */
async function toLocalFile(filePath) {
  if (!REMOTE_URL.test(filePath)) return filePath;

  try {
    const res = await axios.get(filePath, {
      responseType: "arraybuffer",
      timeout: 30_000, // 30s — large PDFs over slow links
      maxRedirects: 5,
    });

    const tmpPath = path.join(
      os.tmpdir(),
      `examock-ingest-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
    );
    fs.writeFileSync(tmpPath, Buffer.from(res.data));
    return tmpPath;
  } catch (err) {
    throw new AppError(
      `Failed to download note from Cloudinary: ${err?.message ?? "unknown error"}`,
      502,
    );
  }
}

export const ingestFile = async (filePath, metadata = {}) => {
  let localPath = filePath;

  try {
    localPath = await toLocalFile(filePath);

    const buffer = fs.readFileSync(localPath);
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
    // Always clean up the temp file — whether it was a multer upload or a
    // Cloudinary download. `existsSync` is a no-op for non-existent paths.
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
};