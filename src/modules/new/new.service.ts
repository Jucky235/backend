import { prisma } from "../../config/db";

export interface GetAllNewsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export interface CreateNewsInput {
  title: string;
  summary?: string;
  content: string;
  category: string;
  thumbnail?: string;
  status?: string;
  authorName?: string;
  tagIds?: string[];
}

export interface UpdateNewsInput extends Partial<CreateNewsInput> {}

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
   * Helper to generate a URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    const slugified = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${slugified}-${Date.now().toString(36)}`;
  }

  /**
   * Fetch paginated news articles with optional filters
   */
  async getAllNews(params?: GetAllNewsParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

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
    const article: any = await prisma.news.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: safeNewsSelect,
    });

    if (!article) {
      return null;
    }

    prisma.news
      .update({
        where: { id: article.id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch((err: unknown) =>
        console.error("Failed to increment viewsCount:", err),
      );

    return {
      ...article,
      viewsCount: article.viewsCount + 1,
      tags: article.tags ? article.tags.map((t: any) => t.tag) : [],
    };
  }

  /**
   * Create a new news article with tag associations
   */
  async createNew(data: CreateNewsInput) {
    const slug = this.generateSlug(data.title);
    const status = data.status || "DRAFT";
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const newArticle: any = await prisma.news.create({
      data: {
        title: data.title,
        slug,
        summary: data.summary,
        content: data.content,
        category: data.category,
        thumbnail: data.thumbnail,
        status: status as any,
        authorName: data.authorName || "Admin",
        publishedAt,
        ...(data.tagIds &&
          data.tagIds.length > 0 && {
            tags: {
              create: data.tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          }),
      },
      select: safeNewsSelect,
    });

    return {
      ...newArticle,
      tags: newArticle.tags ? newArticle.tags.map((t: any) => t.tag) : [],
    };
  }

  /**
   * Update an existing news article and sync its tags
   */
  async updateNews(id: string, data: UpdateNewsInput) {
    const existingArticle = await prisma.news.findUnique({
      where: { id },
      select: { id: true, status: true, publishedAt: true },
    });

    if (!existingArticle) {
      return null;
    }

    const updateData: Record<string, any> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
      updateData.slug = this.generateSlug(data.title);
    }
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.authorName !== undefined) updateData.authorName = data.authorName;

    // Manage status transitions & publishedAt timestamp
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "PUBLISHED" && !existingArticle.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (data.status === "DRAFT" || data.status === "ARCHIVED") {
        updateData.publishedAt = null;
      }
    }

    // Handle tag relationships if tagIds array is provided
    if (data.tagIds !== undefined) {
      updateData.tags = {
        deleteMany: {}, // Wipe previous relations for this news item
        create: data.tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      };
    }

    const updatedArticle: any = await prisma.news.update({
      where: { id },
      data: updateData,
      select: safeNewsSelect,
    });

    return {
      ...updatedArticle,
      tags: updatedArticle.tags
        ? updatedArticle.tags.map((t: any) => t.tag)
        : [],
    };
  }

  /**
   * Delete a news article by ID
   * Wraps tag relation cleanup and article deletion inside a transaction
   */
  async deleteNews(id: string) {
    const existingArticle = await prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingArticle) {
      return null;
    }

    // Perform relational cleanup and record deletion atomically
    const [deletedArticle] = await prisma.$transaction([
      prisma.news.delete({
        where: { id },
        select: { id: true, title: true },
      }),
    ]);

    return deletedArticle;
  }
}
