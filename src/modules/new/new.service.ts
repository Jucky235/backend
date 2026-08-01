import { prisma } from "../../config/db";

export interface GetAllNewsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

const safeNewsSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  content: true,
  thumbnail: true,
  category: true,
  status: true,
  viewsCount: true,
  authorName: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
};

export class NewsService {
  /**
   * Fetch paginated news articles with optional filters
   */
  async getAllNews(params?: GetAllNewsParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

    // Construct plain object where condition without importing Prisma namespace
    const whereCondition: Record<string, any> = {};

    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ];
    }

    if (params?.category && params.category !== "ALL") {
      whereCondition.category = params.category;
    }

    if (params?.status) {
      whereCondition.status = params.status;
    }

    const [newsList, total] = await Promise.all([
      prisma.news.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: safeNewsSelect,
      }),
      prisma.news.count({ where: whereCondition }),
    ]);

    // Flatten nested tag relation array
    const formattedNews = newsList.map((item: any) => ({
      ...item,
      tags: item.tags ? item.tags.map((t: any) => t.tag) : [],
    }));

    return {
      data: formattedNews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch a single news article by ID or Slug and increment view count
   */
  async getNewsById(idOrSlug: string) {
    // Find article matching ID or Slug
    const article: any = await prisma.news.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: safeNewsSelect,
    });

    if (!article) {
      return null;
    }

    // Increment views count in background
    prisma.news
      .update({
        where: { id: article.id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch((err: unknown) =>
        console.error("Failed to increment viewsCount:", err),
      );

    // Return flattened tags and updated view count
    return {
      ...article,
      viewsCount: article.viewsCount + 1,
      tags: article.tags ? article.tags.map((t: any) => t.tag) : [],
    };
  }
}
