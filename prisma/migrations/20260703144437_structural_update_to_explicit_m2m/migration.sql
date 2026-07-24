/*
  Warnings:

  - You are about to drop the `_ExamToQuestion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ExamToQuestion" DROP CONSTRAINT "_ExamToQuestion_A_fkey";

-- DropForeignKey
ALTER TABLE "_ExamToQuestion" DROP CONSTRAINT "_ExamToQuestion_B_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "_ExamToQuestion";

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "partNumber" INTEGER,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("examId","questionId")
);

-- CreateIndex
CREATE INDEX "ExamQuestion_questionId_idx" ON "ExamQuestion"("questionId");

-- CreateIndex
CREATE INDEX "ExamHistory_userId_idx" ON "ExamHistory"("userId");

-- CreateIndex
CREATE INDEX "ExamHistory_examId_idx" ON "ExamHistory"("examId");

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
