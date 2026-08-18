/*
  Warnings:

  - The primary key for the `Exam` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Exam` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `examId` on the `ExamHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `examId` on the `ExamPart` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ExamHistory" DROP CONSTRAINT "ExamHistory_examId_fkey";

-- DropForeignKey
ALTER TABLE "ExamPart" DROP CONSTRAINT "ExamPart_examId_fkey";

-- AlterTable
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Exam_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ExamHistory" DROP COLUMN "examId",
ADD COLUMN     "examId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ExamPart" DROP COLUMN "examId",
ADD COLUMN     "examId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "ExamHistory_examId_idx" ON "ExamHistory"("examId");

-- CreateIndex
CREATE INDEX "ExamPart_examId_idx" ON "ExamPart"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPart_examId_partNumber_key" ON "ExamPart"("examId", "partNumber");

-- AddForeignKey
ALTER TABLE "ExamPart" ADD CONSTRAINT "ExamPart_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamHistory" ADD CONSTRAINT "ExamHistory_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
