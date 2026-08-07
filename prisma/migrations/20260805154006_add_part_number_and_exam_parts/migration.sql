-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "partId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "partNumber" INTEGER;

-- CreateTable
CREATE TABLE "ExamPart" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "audioPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamPart_examId_idx" ON "ExamPart"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPart_examId_partNumber_key" ON "ExamPart"("examId", "partNumber");

-- CreateIndex
CREATE INDEX "ExamQuestion_examId_partNumber_idx" ON "ExamQuestion"("examId", "partNumber");

-- AddForeignKey
ALTER TABLE "ExamPart" ADD CONSTRAINT "ExamPart_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_partId_fkey" FOREIGN KEY ("partId") REFERENCES "ExamPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
