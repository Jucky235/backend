import { type Request, type Response } from "express";

import { generateDailyTest } from "./daily-test.service";

export class DailyTestController {
  // ============================================================
  // 🤖 GENERATE DAILY TOEIC TEST
  // Generates:
  // - 50 new questions
  // - 10 questions for each of the 5 weakest skills
  // - One global daily TOEIC exam
  // ============================================================

  async generateDailyTest(req: Request, res: Response): Promise<void> {
    try {
      const data = await generateDailyTest();

      res.json(data);
    } catch (error) {
      console.error("Error generating daily test:", error);

      res.status(500).json({
        message: "Failed to generate daily test",
      });
    }
  }
}
