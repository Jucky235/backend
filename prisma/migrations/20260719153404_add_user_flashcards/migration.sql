-- CreateEnum
CREATE TYPE "FlashcardStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeckVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "BoxLevel" AS ENUM ('BOX_1', 'BOX_2', 'BOX_3', 'BOX_4', 'BOX_5', 'BOX_6', 'BOX_7');

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExamCategory" NOT NULL,
    "status" "FlashcardStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "DeckVisibility" NOT NULL DEFAULT 'PRIVATE',
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "frontContent" TEXT NOT NULL,
    "backContent" TEXT NOT NULL,
    "explanation" TEXT,
    "imagePath" TEXT,
    "audioPath" TEXT,
    "partNumber" INTEGER,
    "status" "FlashcardStatus" NOT NULL DEFAULT 'ACTIVE',
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "box" "BoxLevel" NOT NULL DEFAULT 'BOX_1',
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDeckProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "totalCardsViewed" INTEGER NOT NULL DEFAULT 0,
    "masteredCards" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeckProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deck_creatorId_idx" ON "Deck"("creatorId");

-- CreateIndex
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");

-- CreateIndex
CREATE INDEX "Flashcard_creatorId_idx" ON "Flashcard"("creatorId");

-- CreateIndex
CREATE INDEX "FlashcardProgress_userId_nextReviewAt_idx" ON "FlashcardProgress"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardProgress_userId_flashcardId_key" ON "FlashcardProgress"("userId", "flashcardId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDeckProgress_userId_deckId_key" ON "UserDeckProgress"("userId", "deckId");

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardProgress" ADD CONSTRAINT "FlashcardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeckProgress" ADD CONSTRAINT "UserDeckProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeckProgress" ADD CONSTRAINT "UserDeckProgress_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
