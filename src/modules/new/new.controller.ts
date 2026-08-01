import { type Response } from "express";
import { type AuthenticatedRequest } from "../../middleware/auth";
import { NewsService } from "./new.service";

export class NewController {
  private newsService = new NewsService();

  /**
   * GET /api/news
   */
  async getAllNews(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
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
  }

  /**
   * GET /api/news/:id
   */
  async getNewsById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
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
  }
}
