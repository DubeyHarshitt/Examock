-- Baseline for pre-existing drift: `otp_records.mobile` was made nullable,
-- `otp_records.email` and its index were added — all out-of-band (no
-- migration). The live database already has these; this file is marked as
-- applied via `prisma migrate resolve --applied` and is never executed.
ALTER TABLE "otp_records" ALTER COLUMN "mobile" DROP NOT NULL;
ALTER TABLE "otp_records" ADD COLUMN "email" TEXT;
CREATE INDEX "otp_records_email_idx" ON "otp_records"("email");
