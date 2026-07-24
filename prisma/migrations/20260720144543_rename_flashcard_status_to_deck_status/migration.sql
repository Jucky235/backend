/*
  Warnings:

  - The `status` column on the `Deck` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Flashcard` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeckStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "status",
ADD COLUMN     "status" "DeckStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "status",
ADD COLUMN     "status" "DeckStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "FlashcardStatus";
