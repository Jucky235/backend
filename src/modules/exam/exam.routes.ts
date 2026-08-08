import { Router } from "express";
import { ExamController } from "./exam.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const examController = new ExamController();

// GET /api/exams - Get list of active tests
router.get("/", examController.getAll);

// GET /api/exams/:id - Get specific test with questions
router.get("/:id", examController.getById);

// POST /api/exams - Create a new exam
router.post("/", authenticateJWT, (req, res) =>
  examController.create(req, res),
);

// POST /api/exams/submit - Submit exam results
router.post("/submit", authenticateJWT, (req, res) =>
  examController.submitExam(req, res),
);

export default router;
