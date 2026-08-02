import { type Response } from "express";
import { type AuthenticatedRequest } from "../../middleware/auth";
import { NewsService } from "./new.service";

export class NewController {
  private newsService = new NewsService();

  /**
   * GET /api/news
   */
  getAllNews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;
      const search = req.query.search
        ? (req.query.search as string)
        : undefined;
      const category = req.query.category
        ? (req.query.category as string)
        : undefined;
      const status = req.query.status
        ? (req.query.status as string)
        : undefined;

      const result = await this.newsService.getAllNews({
        page,
        limit,
        search,
        category,
        status,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getAllNews controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * GET /api/news/:id
   */
  getNewsById = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json({ error: "Article ID or slug is required" });
      }

      const article = await this.newsService.getNewsById(id);

      if (!article) {
        return res.status(404).json({ error: "News article not found" });
      }

      return res.status(200).json({
        success: true,
        data: article,
      });
    } catch (error: any) {
      console.error("Error in getNewsById controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * POST /api/news
   */
  createNew = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const { title, summary, content, category, thumbnail, status, tagIds } =
        req.body;

      // Basic payload validation
      if (!title || !content || !category) {
        return res.status(400).json({
          error: "Title, content, and category are required fields",
        });
      }

      // Try to resolve author name from authenticated user session/token
      const authorName = req.user?.email || "Admin";

      const newArticle = await this.newsService.createNew({
        title,
        summary,
        content,
        category,
        thumbnail,
        status,
        authorName,
        tagIds,
      });

      return res.status(201).json({
        success: true,
        message: "News article created successfully",
        data: newArticle,
      });
    } catch (error: any) {
      console.error("Error in createNew controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * PUT /api/news/:id
   */
  updateNews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Article ID is required" });
      }

      const { title, summary, content, category, thumbnail, status, tagIds } =
        req.body;

      const updatedArticle = await this.newsService.updateNews(id, {
        title,
        summary,
        content,
        category,
        thumbnail,
        status,
        tagIds,
      });

      if (!updatedArticle) {
        return res.status(404).json({ error: "News article not found" });
      }

      return res.status(200).json({
        success: true,
        message: "News article updated successfully",
        data: updatedArticle,
      });
    } catch (error: any) {
      console.error("Error in updateNews controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /**
   * DELETE /api/news/:id
   */
  deleteNews = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Article ID is required" });
      }

      const deletedArticle = await this.newsService.deleteNews(id);

      if (!deletedArticle) {
        return res.status(404).json({ error: "News article not found" });
      }

      return res.status(200).json({
        success: true,
        message: "News article deleted successfully",
        data: { id: deletedArticle.id },
      });
    } catch (error: any) {
      console.error("Error in deleteNews controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
