-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('GENERAL', 'EXAM_TIPS', 'ANNOUNCEMENT', 'SYSTEM_UPDATE', 'FEATURED');

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "thumbnail" TEXT,
    "category" "NewsCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "authorName" TEXT DEFAULT 'Admin',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsTag" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsTagRelation" (
    "newsId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "NewsTagRelation_pkey" PRIMARY KEY ("newsId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsTag_name_key" ON "NewsTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NewsTag_slug_key" ON "NewsTag"("slug");

-- CreateIndex
CREATE INDEX "NewsTagRelation_tagId_idx" ON "NewsTagRelation"("tagId");

-- AddForeignKey
ALTER TABLE "NewsTagRelation" ADD CONSTRAINT "NewsTagRelation_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsTagRelation" ADD CONSTRAINT "NewsTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "NewsTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
