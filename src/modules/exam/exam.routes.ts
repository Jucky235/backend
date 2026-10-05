// exam.router.ts
import { Router } from "express";
import { ExamController } from "./exam.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const examController = new ExamController();

// 1. All base/static endpoints FIRST
router.get("/", (req, res) => examController.getAll(req, res));
router.get("/daily", (req, res) => examController.getDailyExam(req, res));

// 2. Dynamic parameterized endpoint AFTER static strings
router.get("/:id", (req, res) => examController.getById(req, res));

// POST routes
router.post("/", authenticateJWT, (req, res) =>
  examController.create(req, res),
);
router.post("/submit", authenticateJWT, (req, res) =>
  examController.submitExam(req, res),
);
router.post("/:id/questions", authenticateJWT, (req, res) =>
  examController.addQuestions(req, res),
);

export default router;
