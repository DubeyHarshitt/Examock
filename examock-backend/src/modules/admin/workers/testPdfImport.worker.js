// workers/testPdfImport.worker.js (ticket 09) — mirrors noteIngestion.worker.js
// exactly: PENDING → PROCESSING → READY | FAILED, mark FAILED on the final
// attempt, rethrow so pg-boss retries. Parsing lives HERE, never on the HTTP
// path — pm2 caps the heap at 512 MB and pdf-parse reads the whole file
// synchronously, so a 40 MB paper belongs in a worker, not a request handler.
import fs from "fs";
import pdfParse from "pdf-parse";
import { boss, QUEUE } from "../../../config/queue.js";
import prisma from "../../../config/prisma.js";
import { parseQuestionBlocks } from "../lib/pdfQuestionParser.js";
import { AppError } from "../../../utils/AppError.js";

// Bounds (ticket 09 §Bounds): a question paper ≤ page cap; more than that is a
// book. Scanned detection: count extractable characters per page.
const MAX_PAGES = 100;
const SCANNED_CHARS_PER_PAGE = 20;

await boss.work(QUEUE.IMPORT_TEST_PDF, { retryLimit: 3, retryBackoff: true }, async ([job]) => {
  const { importId } = job.data;
  const importRow = await prisma.testPdfImport.findUniqueOrThrow({ where: { id: importId } });

  await prisma.testPdfImport.update({
    where: { id: importId },
    data: { status: "PROCESSING", error: null },
  });

  try {
    const buffer = fs.readFileSync(importRow.filePath);
    const parsed = await pdfParse(buffer);
    const text = parsed.text ?? "";
    const pages = parsed.numpages ?? 0;

    if (pages > MAX_PAGES) {
      throw new AppError(
        `This PDF has ${pages} pages — the cap is ${MAX_PAGES}. Import a question paper, not a book.`,
        400,
      );
    }
    if (pages > 0 && text.trim().length < pages * SCANNED_CHARS_PER_PAGE) {
      throw new AppError(
        "This PDF has no extractable text — it looks scanned. OCR is not available yet.",
        400,
      );
    }

    // Draft rows only — same contract as the CSV import (tickets 06/08).
    // correctOption is always null (never extracted); the admin ticks rows in
    // the grid, and Activate blocks until every row has one (ticket 03).
    const rows = parseQuestionBlocks(text).map((row) => ({
      ...row,
      isReusable: false, // past-paper rows are never practice items
    }));

    await prisma.testPdfImport.update({
      where: { id: importId },
      data: {
        status: "READY",
        error: null,
        rows,
        rowCount: rows.length,
        parsedAt: new Date(),
      },
    });

    // The import row is persisted — the local temp file is not needed anymore.
    if (fs.existsSync(importRow.filePath)) fs.unlinkSync(importRow.filePath);
  } catch (err) {
    // A deterministic input rejection (scanned PDF, page-cap) fails identically
    // on every attempt, so mark FAILED now rather than making the admin wait
    // through three pointless backoffs. Only transient errors retry.
    const deterministic = err instanceof AppError;
    // pg-boss v10 exposes retryCount/retryLimit (camelCase) on the job object.
    const lastAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 1);
    if (deterministic || lastAttempt) {
      await prisma.testPdfImport.update({
        where: { id: importId },
        data: { status: "FAILED", error: err?.message ?? "PDF parsing failed" },
      });
      // FAILED rows will not retry — the temp file can go now.
      if (fs.existsSync(importRow.filePath)) fs.unlinkSync(importRow.filePath);
    }
    // Transient, non-final: keep the file and let pg-boss retry.
    if (!deterministic) throw err;
  }
});

// Stuck-import sweeper (ticket 09 §verify). A row still PENDING/PROCESSING well
// past the pg-boss retry envelope means the process died mid-parse and no retry
// remains — the poller would spin forever. Fail it on boot so the admin sees an
// actionable error. The 30-minute floor sits far beyond retryBackoff, so an
// in-flight job (which always finishes within seconds of upload) is never
// clobbered; a legitimately queued job still runs and overwrites this state.
const STUCK_AFTER_MS = 30 * 60 * 1000;
const swept = await prisma.testPdfImport.updateMany({
  where: {
    status: { in: ["PENDING", "PROCESSING"] },
    createdAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
  },
  data: { status: "FAILED", error: "Parsing timed out — please re-upload the PDF." },
});
if (swept.count > 0) {
  console.warn(`[testPdfImport] swept ${swept.count} stuck import(s) to FAILED`);
}