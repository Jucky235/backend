import { prisma } from "../src/config/db";

const NEWS_THUMBNAILS = [
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&h=630&q=80",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&h=630&q=80",
];

async function updateNewsThumbnails() {
  const news = await prisma.news.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (let index = 0; index < news.length; index++) {
    await prisma.news.update({
      where: { id: news[index].id },
      data: { thumbnail: NEWS_THUMBNAILS[index % NEWS_THUMBNAILS.length] },
    });
  }

  console.log(`Updated thumbnails for ${news.length} news articles.`);
}

updateNewsThumbnails()
  .catch((error) => {
    console.error("Failed to update news thumbnails:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
