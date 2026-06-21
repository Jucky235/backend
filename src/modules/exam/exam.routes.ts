import { Router } from "express";
import { ExamController } from "./exam.controller";

const router = Router();
const examController = new ExamController();

// GET /api/exams - Get list of active tests
router.get("/", examController.getAll);

// GET /api/exams/:id - Get specific test with questions
router.get("/:id", examController.getById);

export default router;
