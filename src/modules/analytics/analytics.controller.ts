import { type Request, type Response } from "express";

import {
  getUserRanking,
  getUserSkillSummary,
  getUserSkillPerformance,
  getUserWeakSkills,
} from "./analytics.service";

export class AnalyticsController {
  // ============================================================
  // SOCIAL RANKING
  // ============================================================

  async getRanking(req: Request, res: Response): Promise<void> {
    try {
      const data = await getUserRanking();

      res.json(data);
    } catch (error) {
      console.error("Error in ranking controller:", error);

      res.status(500).json({
        message: "Failed to get ranking",
      });
    }
  }

  // ============================================================
  // USER SKILL SUMMARY
  // Dashboard overview
  // ============================================================

  async getUserSkillSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const data = await getUserSkillSummary(userId);

      res.json(data);
    } catch (error) {
      console.error("Error getting skill summary:", error);

      res.status(500).json({
        message: "Failed to get skill summary",
      });
    }
  }

  // ============================================================
  // USER SKILL PERFORMANCE
  // Child skills
  // AI + detailed analytics
  // ============================================================

  async getUserSkillPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const data = await getUserSkillPerformance(userId);

      res.json(data);
    } catch (error) {
      console.error("Error getting skill performance:", error);

      res.status(500).json({
        message: "Failed to get skill performance",
      });
    }
  }

  // ============================================================
  // USER WEAK SKILLS
  // AI roadmap generator
  // ============================================================

  async getUserWeakSkills(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const limit = Number(req.query.limit ?? 10);

      const data = await getUserWeakSkills(userId, limit);

      res.json(data);
    } catch (error) {
      console.error("Error getting weak skills:", error);

      res.status(500).json({
        message: "Failed to get weak skills",
      });
    }
  }
}
