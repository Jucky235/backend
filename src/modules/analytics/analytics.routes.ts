import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();

const controller = new AnalyticsController();

// ============================================================
// 📊 Social Ranking
// ============================================================

router.get("/ranking", authenticateJWT, (req, res) =>
  controller.getRanking(req, res),
);

// ============================================================
// 📈 User Skill Summary
// Dashboard overview (parent skills)
// ============================================================

router.get("/users/:userId/skills", authenticateJWT, (req, res) =>
  controller.getUserSkillSummary(req, res),
);

// ============================================================
// 🧠 User Skill Detail
// Child skills for AI + detailed view
// ============================================================

router.get("/users/:userId/skills/detail", authenticateJWT, (req, res) =>
  controller.getUserSkillPerformance(req, res),
);

// ============================================================
// 🤖 AI Roadmap Input
// Weakest skills
// ============================================================

router.get("/users/:userId/weak-skills", authenticateJWT, (req, res) =>
  controller.getUserWeakSkills(req, res),
);

export default router;
