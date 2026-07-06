// workers/noteIngestion.worker.js
import { boss, QUEUE } from "../../../config/queue.js";
import prisma from "../../../config/prisma.js";
import { ingestFile } from "../pipelines/ingestion.pipeline.js";
// import { deleteChunksByNoteId } from "../ragUtils/vectorStore.js";

await boss.work(QUEUE.INGEST_NOTE, { retryLimit: 3, retryBackoff: true }, async ([job]) => {
  const { noteId } = job.data;
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });

  if (note.fileType !== "PDF") {
    // Not a hard failure — just not implemented yet. Mark it so the UI
    // doesn't show a spinner forever, and doesn't retry pointlessly.
    await prisma.note.update({
      where: { id: noteId },
      data: {
        embeddingStatus: "FAILED",
        embeddingError: `Ingestion for ${note.fileType} not implemented yet — PDF only.`,
      },
    });
    return; // don't throw — no point retrying an unsupported type
  }

  await prisma.note.update({ where: { id: noteId }, data: { embeddingStatus: "PROCESSING" } });

  try {
    await ingestFile(note.filePath, {
      noteId: note.id,
      examTypeId: note.examTypeId,
      fileName: note.fileName,
    });

    await prisma.note.update({
      where: { id: noteId },
      data: { embeddingStatus: "READY", embeddingError: null },
    });
  } catch (err) {
    if (job.retrycount >= job.retrylimit) {
      await prisma.note.update({
        where: { id: noteId },
        data: { embeddingStatus: "FAILED", embeddingError: err.message },
      });
    }
    throw err; // let pg-boss retry
  }
});

// Cleanup queue — runs when a note is soft-deleted
// await boss.work(QUEUE.DELETE_NOTE_CHUNKS, async ([job]) => {
//   await deleteChunksByNoteId(job.data.noteId);
// });