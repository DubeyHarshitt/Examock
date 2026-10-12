-- Ticket 09 (PDF ingestion): import jobs. One row per upload; the worker
-- advances PENDING → PROCESSING → READY | FAILED and stores the heuristic
-- parser's draft rows in `rows` (JSONB — the shared draft-row contract from
-- tickets 06/08). Nothing reaches `questions` until the admin reviews the
-- grid and clicks Save.
CREATE TABLE "test_pdf_imports" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "parsed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rows" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "test_pdf_imports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "test_pdf_imports_test_id_idx" ON "test_pdf_imports"("test_id");