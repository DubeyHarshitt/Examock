-- Ticket 08 (CSV import) + 09 (PDF ingestion): draft rows may carry an
-- unticked correct answer. The rule is "never infer the correct answer" —
-- imported/parsed questions land in the grid with correct_option = NULL and
-- the activation guard (MISSING_ANSWER, admin.service.js) blocks activating
-- a test until every question has been ticked (ticket 03).
ALTER TABLE "questions" ALTER COLUMN "correct_option" DROP NOT NULL;