/*
  Warnings:

  - You are about to drop the column `topic_id` on the `mock_tests` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `mock_tests` table. All the data in the column will be lost.

*/
-- Backfill (spec §4.4): old CHAPTER tests become subject-scoped before
-- `topic_id` is dropped. Old MODULE tests already carry subject_id;
-- old FULL tests keep subject_id = NULL. Dev/test data — no archival step.
UPDATE "mock_tests" m
   SET "subject_id" = t."subject_id"
  FROM "topics" t
 WHERE m."topic_id" = t."id";

-- DropForeignKey
ALTER TABLE "mock_tests" DROP CONSTRAINT "mock_tests_topic_id_fkey";

-- DropIndex
DROP INDEX "mock_tests_type_is_free_idx";

-- AlterTable
ALTER TABLE "mock_tests" DROP COLUMN "topic_id",
DROP COLUMN "type",
ADD COLUMN     "default_marks" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "default_neg_marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "is_free" SET DEFAULT true,
ALTER COLUMN "is_active" SET DEFAULT false;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "had_figure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image_public_id" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_reusable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- DropEnum
DROP TYPE "TestType";

-- CreateIndex
CREATE INDEX "mock_tests_subject_id_idx" ON "mock_tests"("subject_id");
