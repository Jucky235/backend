import { Request, Response } from "express";
import { NavigationSearchService } from "./ai/navigation-search.service";

const navigationSearchService = new NavigationSearchService();

export class NavigationController {
  async searchRoute(req: Request, res: Response) {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query string is required" });
      }

      const result = await navigationSearchService.searchRouteByIntent(query);
      return res.json(result);
    } catch (error: any) {
      console.error("Navigation Search Error:", error);
      return res
        .status(500)
        .json({ error: error.message || "Internal server error" });
    }
  }
}
