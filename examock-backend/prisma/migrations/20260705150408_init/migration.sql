/*
  Warnings:

  - You are about to drop the column `file_size_mb` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `file_type` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `notes` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `notes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `notes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmbeddingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "file_size_mb",
DROP COLUMN "file_type",
DROP COLUMN "file_url",
ADD COLUMN     "embeddingError" TEXT,
ADD COLUMN     "embeddingStatus" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "filePath" TEXT NOT NULL,
ADD COLUMN     "fileSizeMb" DOUBLE PRECISION,
ADD COLUMN     "fileType" "FileType" NOT NULL;
