import PgBoss from "pg-boss";
import config from "./config.js";

export const boss = new PgBoss(config.DATABASE_URL);

boss.on("error", (err) => {
  console.error("[pg-boss error]", err.message);
});

await boss.start();

export const QUEUE = { INGEST_NOTE: "ingest-note", DELETE_NOTE_CHUNKS: "delete-note-chunks" };