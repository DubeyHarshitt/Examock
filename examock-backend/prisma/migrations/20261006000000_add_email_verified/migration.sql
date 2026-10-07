-- Baseline for pre-existing drift: this column was added to the database
-- out-of-band (no migration). Recorded here so `prisma migrate dev` stops
-- detecting drift. The column already exists; this file is marked as applied
-- via `prisma migrate resolve --applied`, never executed.
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
