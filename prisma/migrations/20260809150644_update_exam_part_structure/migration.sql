/*
  Warnings:

  - The primary key for the `ExamQuestion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `examId` on the `ExamQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `partNumber` on the `ExamQuestion` table. All the data in the column will be lost.
  - Made the column `partId` on table `ExamQuestion` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_examId_fkey";

-- DropForeignKey
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_partId_fkey";

-- DropIndex
DROP INDEX "ExamQuestion_examId_partNumber_idx";

-- AlterTable
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_pkey",
DROP COLUMN "examId",
DROP COLUMN "partNumber",
ALTER COLUMN "partId" SET NOT NULL,
ADD CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("partId", "questionId");

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_partId_fkey" FOREIGN KEY ("partId") REFERENCES "ExamPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
