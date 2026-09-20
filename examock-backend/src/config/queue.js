import PgBoss from "pg-boss";
import config from "./config.js";

// pg-boss uses LISTEN/NOTIFY + advisory locks, which are NOT supported over
// the Supabase transaction pooler (`DATABASE_URL`, `?pgbouncer=true`).
// DIRECT_URL is the session-mode connection (port 5432) — always use it here.
export const boss = new PgBoss(config.DIRECT_URL);

boss.on("error", (err) => {
  console.error("[pg-boss error]", err.message);
});

await boss.start();

export const QUEUE = { INGEST_NOTE: "ingest-note", DELETE_NOTE_CHUNKS: "delete-note-chunks" };

// pg-boss v10 requires every queue to be explicitly registered via
// `createQueue()` — otherwise `boss.send()` silently drops jobs: its INSERT
// SELECT JOINs `pgboss.queue`, and a missing row means zero rows inserted
// (send() resolves to null, no error, no job). This is idempotent
// (ON CONFLICT DO NOTHING), so it's safe on every boot.
for (const queue of Object.values(QUEUE)) {
  await boss.createQueue(queue);
}