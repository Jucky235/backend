import { PostStatus, VoteType } from "@prisma/client";
import { prisma } from "../../config/db";

// ==========================================
// --- INTERFACES ---
// ==========================================

export interface CreatePostInput {
  title: string;
  slug: string;
  content: string;
  categoryId: string;
  attachments?: string[];
}

export interface GetAllPostsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  sortBy?: "hot" | "top" | "new";
  search?: string;
}

export interface CreateCommentInput {
  postId: string;
  content: string;
  parentId?: string;
}

export interface VoteInput {
  type: VoteType;
}

// Struct SELECT dùng chung cho Forum Post
const safePostSelect = {
  id: true,
  title: true,
  slug: true,
  content: true,
  attachments: true,
  status: true,
  isPinned: true,
  isLocked: true,
  viewsCount: true,
  upvotesCount: true,
  downvotesCount: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
};

export class ForumService {
  // 🟢 1. Lấy danh sách Categories
  async getAllCategories() {
    return await prisma.forumCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  // 🟢 2. Lấy danh sách Posts (Có phân trang, search, filter category & sắp xếp)
  async getAllPosts(params?: GetAllPostsParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

    // Dựng điều kiện lọc where
    const whereCondition: Record<string, any> = {
      status: PostStatus.PUBLISHED,
    };

    if (params?.categoryId) {
      whereCondition.categoryId = params.categoryId;
    }

    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
        { content: { contains: search, mode: "insensitive" as const } },
      ];
    }

    // Determine sorting logic
    let orderBy: any = { createdAt: "desc" };
    if (params?.sortBy === "top") {
      orderBy = { upvotesCount: "desc" };
    } else if (params?.sortBy === "hot") {
      orderBy = [{ upvotesCount: "desc" }, { createdAt: "desc" }];
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy,
        select: safePostSelect,
      }),
      prisma.forumPost.count({ where: whereCondition }),
    ]);

    // Map `_count.comments` thành `commentsCount` để đồng bộ UI
    const formattedPosts = posts.map((post) => ({
      ...post,
      commentsCount: post._count.comments,
    }));

    return {
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🟢 3. Lấy chi tiết Post theo ID (Kèm comment tree & tăng view count)
  async getPostById(id: string, currentUserId?: string) {
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: {
        ...safePostSelect,
        comments: {
          where: { parentId: null }, // Top-level comments
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            isEdited: true,
            upvotesCount: true,
            downvotesCount: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            replies: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                content: true,
                isEdited: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new Error("Bài viết không tồn tại");
    }

    // Tăng viewsCount bất đồng bộ
    await prisma.forumPost.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    // Kiểm tra trạng thái Vote của user hiện tại
    let currentUserVote: VoteType | null = null;
    if (currentUserId) {
      const vote = await prisma.forumPostVote.findUnique({
        where: {
          userId_postId: { userId: currentUserId, postId: id },
        },
      });
      currentUserVote = vote ? vote.type : null;
    }

    return {
      ...post,
      commentsCount: post._count.comments, // Trả về con số chính xác từ DB
      currentUserVote,
    };
  }

  // 🟢 4. Tạo Bài Viết Mới
  async createPost(authorId: string, data: CreatePostInput) {
    const category = await prisma.forumCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new Error("Category không tồn tại");
    }

    const createdPost = await prisma.forumPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        attachments: data.attachments || [],
        categoryId: data.categoryId,
        authorId,
      },
      select: safePostSelect,
    });

    return {
      ...createdPost,
      commentsCount: createdPost._count.comments,
    };
  }

  // 🟢 5. Upvote / Downvote Bài Viết (Xử lý Transaction & đếm tự động)
  async votePost(userId: string, postId: string, input: VoteInput) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error("Bài viết không tồn tại");
    }

    const existingVote = await prisma.forumPostVote.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    const updatedPost = await prisma.$transaction(async (tx) => {
      // Trường hợp 1: Hủy vote khi bấm lại nút cũ
      if (existingVote && existingVote.type === input.type) {
        await tx.forumPostVote.delete({
          where: { id: existingVote.id },
        });

        const decrementField =
          input.type === VoteType.UPVOTE ? "upvotesCount" : "downvotesCount";

        return await tx.forumPost.update({
          where: { id: postId },
          data: { [decrementField]: { decrement: 1 } },
          select: safePostSelect,
        });
      }

      // Trường hợp 2: Đổi vote (Upvote <-> Downvote)
      if (existingVote && existingVote.type !== input.type) {
        await tx.forumPostVote.update({
          where: { id: existingVote.id },
          data: { type: input.type },
        });

        const isNowUpvote = input.type === VoteType.UPVOTE;

        return await tx.forumPost.update({
          where: { id: postId },
          data: {
            upvotesCount: isNowUpvote ? { increment: 1 } : { decrement: 1 },
            downvotesCount: isNowUpvote ? { decrement: 1 } : { increment: 1 },
          },
          select: safePostSelect,
        });
      }

      // Trường hợp 3: Vote lần đầu
      await tx.forumPostVote.create({
        data: {
          userId,
          postId,
          type: input.type,
        },
      });

      const incrementField =
        input.type === VoteType.UPVOTE ? "upvotesCount" : "downvotesCount";

      return await tx.forumPost.update({
        where: { id: postId },
        data: { [incrementField]: { increment: 1 } },
        select: safePostSelect,
      });
    });

    return {
      ...updatedPost,
      commentsCount: updatedPost._count.comments,
    };
  }

  // 🟢 6. Thêm Comment / Reply bài viết
  async createComment(authorId: string, data: CreateCommentInput) {
    const post = await prisma.forumPost.findUnique({
      where: { id: data.postId },
    });

    if (!post) {
      throw new Error("Bài viết không tồn tại");
    }

    if (post.isLocked) {
      throw new Error("Bài viết này đã bị khóa bình luận");
    }

    if (data.parentId) {
      const parentComment = await prisma.forumComment.findUnique({
        where: { id: data.parentId },
      });
      if (!parentComment) {
        throw new Error("Bình luận cha không tồn tại");
      }
    }

    // Không cần dùng transaction increment manual nữa
    return await prisma.forumComment.create({
      data: {
        content: data.content,
        postId: data.postId,
        authorId,
        parentId: data.parentId || null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // 🟢 7. Bookmark / Lưu bài viết
  async toggleSavePost(userId: string, postId: string) {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error("Bài viết không tồn tại");
    }

    const existingSave = await prisma.savedPost.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingSave) {
      await prisma.savedPost.delete({
        where: { id: existingSave.id },
      });
      return { saved: false };
    }

    await prisma.savedPost.create({
      data: { userId, postId },
    });
    return { saved: true };
  }

  // 🟢 8. Xóa bài viết
  async deletePost(id: string, currentUserId: string) {
    const existingPost = await prisma.forumPost.findUnique({
      where: { id },
    });

    if (!existingPost) {
      throw new Error("Bài viết không tồn tại");
    }

    if (existingPost.authorId !== currentUserId) {
      throw new Error("Bạn không có quyền xóa bài viết này");
    }

    const deletedPost = await prisma.forumPost.delete({
      where: { id },
      select: safePostSelect,
    });

    return {
      ...deletedPost,
      commentsCount: deletedPost._count.comments,
    };
  }
}
