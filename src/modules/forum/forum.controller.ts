import { type Response } from "express";
import { type AuthenticatedRequest } from "../../middleware/auth";
import { ForumService } from "./forum.service";

export class ForumController {
  private forumService = new ForumService();

  // 🟢 1. GET /api/forum/categories - Lấy danh sách tất cả Categories
  async getAllCategories(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const categories = await this.forumService.getAllCategories();
      return res.status(200).json(categories);
    } catch (error: any) {
      console.error("Error in getAllCategories controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 2. GET /api/forum/posts - Lấy danh sách Posts (Phân trang, search, filter, sort)
  async getAllPosts(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;
      const categoryId = req.query.categoryId
        ? (req.query.categoryId as string)
        : undefined;
      const sortBy = req.query.sortBy
        ? (req.query.sortBy as "hot" | "top" | "new")
        : undefined;
      const search = req.query.search
        ? (req.query.search as string)
        : undefined;

      const result = await this.forumService.getAllPosts({
        page,
        limit,
        categoryId,
        sortBy,
        search,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getAllPosts controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 3. GET /api/forum/posts/:id - Lấy chi tiết 1 Bài viết kèm comments
  async getPostById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Optional user context to check vote status

      const post = await this.forumService.getPostById(id, userId);
      return res.status(200).json(post);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || "Bài viết không tồn tại",
      });
    }
  }

  // 🟢 4. POST /api/forum/posts - Tạo Bài Viết Mới
  async createPost(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { title, slug, content, categoryId, attachments } = req.body;

      if (!title || typeof title !== "string" || title.trim() === "") {
        return res
          .status(400)
          .json({ error: "Tiêu đề bài viết không được để trống" });
      }

      if (!slug || typeof slug !== "string" || slug.trim() === "") {
        return res.status(400).json({ error: "Slug là bắt buộc" });
      }

      if (!content || typeof content !== "string" || content.trim() === "") {
        return res
          .status(400)
          .json({ error: "Nội dung bài viết không được để trống" });
      }

      if (!categoryId || typeof categoryId !== "string") {
        return res.status(400).json({ error: "CategoryId là bắt buộc" });
      }

      const newPost = await this.forumService.createPost(authorId, {
        title,
        slug,
        content,
        categoryId,
        attachments: attachments || [],
      });

      return res.status(201).json({
        message: "Tạo bài viết thành công",
        data: newPost,
      });
    } catch (error: any) {
      console.error("Error in createPost controller:", error);
      return res.status(400).json({
        error: error.message || "Tạo bài viết thất bại",
      });
    }
  }

  // 🟢 5. POST /api/forum/posts/:id/vote - Upvote / Downvote bài viết
  async votePost(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { id: postId } = req.params;
      const { type } = req.body;

      if (!type || (type !== "UPVOTE" && type !== "DOWNVOTE")) {
        return res
          .status(400)
          .json({ error: "Loại vote không hợp lệ (UPVOTE hoặc DOWNVOTE)" });
      }

      const updatedPost = await this.forumService.votePost(userId, postId, {
        type,
      });

      return res.status(200).json({
        message: "Xử lý vote thành công",
        data: updatedPost,
      });
    } catch (error: any) {
      console.error("Error in votePost controller:", error);
      return res.status(400).json({
        error: error.message || "Xử lý vote thất bại",
      });
    }
  }

  // 🟢 6. POST /api/forum/posts/:id/comments - Thêm Comment hoặc Reply
  async createComment(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { id: postId } = req.params;
      const { content, parentId } = req.body;

      if (!content || typeof content !== "string" || content.trim() === "") {
        return res
          .status(400)
          .json({ error: "Nội dung bình luận không được để trống" });
      }

      const comment = await this.forumService.createComment(authorId, {
        postId,
        content,
        parentId,
      });

      return res.status(201).json({
        message: "Thêm bình luận thành công",
        data: comment,
      });
    } catch (error: any) {
      console.error("Error in createComment controller:", error);
      return res.status(400).json({
        error: error.message || "Thêm bình luận thất bại",
      });
    }
  }

  // 🟢 7. POST /api/forum/posts/:id/save - Bookmark / Hủy Bookmark bài viết
  async toggleSavePost(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { id: postId } = req.params;
      const result = await this.forumService.toggleSavePost(userId, postId);

      return res.status(200).json({
        message: result.saved
          ? "Lưu bài viết thành công"
          : "Hủy lưu bài viết thành công",
        saved: result.saved,
      });
    } catch (error: any) {
      console.error("Error in toggleSavePost controller:", error);
      return res.status(400).json({
        error: error.message || "Thao tác thất bại",
      });
    }
  }

  // 🟢 8. DELETE /api/forum/posts/:id - Xóa bài viết theo ID
  async deletePost(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { id } = req.params;
      const deletedPost = await this.forumService.deletePost(id, userId);

      return res.status(200).json({
        message: "Xóa bài viết thành công",
        data: deletedPost,
      });
    } catch (error: any) {
      console.error("Error in deletePost controller:", error);
      return res.status(400).json({
        error: error.message || "Xóa bài viết thất bại",
      });
    }
  }
}
