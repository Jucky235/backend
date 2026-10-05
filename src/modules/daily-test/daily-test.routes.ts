import { Router } from "express";

import { authenticateJWT } from "../../middleware/auth";

import { DailyTestController } from "./daily-test.controller";

const router = Router();

const controller = new DailyTestController();

// ============================================================
// 🤖 Generate Daily TOEIC Test
// ============================================================
//
// Creates one global daily test based on the
// community's 5 weakest skills.
//
// Requires authentication.
//

router.post("/generate", authenticateJWT, (req, res) =>
  controller.generateDailyTest(req, res),
);

export default router;
