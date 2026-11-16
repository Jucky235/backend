CREATE TABLE "NewsLike" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsLike_newsId_userId_key" ON "NewsLike"("newsId", "userId");
CREATE INDEX "NewsLike_userId_idx" ON "NewsLike"("userId");

ALTER TABLE "NewsLike" ADD CONSTRAINT "NewsLike_newsId_fkey"
    FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsLike" ADD CONSTRAINT "NewsLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
