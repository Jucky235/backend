import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { RoadmapController } from "./roadmap.controller";

const router = Router();
const controller = new RoadmapController();

// ============================================================
// 📖 Get User Roadmap
// GET /api/roadmap
// ============================================================
router.get("/", authenticateJWT, controller.getRoadmap);

// ============================================================
// 🤖 Generate Personalized User Roadmap Test
// POST /api/roadmap/generate
// ============================================================
router.post("/generate", authenticateJWT, controller.generateRoadmapTest);

// ============================================================
// 🔄 Update Roadmap Node Status
// PATCH /api/roadmap/nodes/:nodeId/status
// ============================================================
router.patch(
  "/nodes/:nodeId/status",
  authenticateJWT,
  controller.updateNodeStatus,
);

export default router;
