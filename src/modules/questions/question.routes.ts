import { Router } from "express";
import { QuestionController } from "./question.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const questionController = new QuestionController();

// GET /api/questions - Fetch all questions with filters and pagination
router.get("/", (req, res) => questionController.getAll(req, res));

// GET /api/questions/:id - Fetch a single question by ID
router.get("/:id", (req, res) => questionController.getById(req, res));

// POST /api/questions - Create a single question
router.post("/", authenticateJWT, (req, res) =>
  questionController.create(req, res),
);

// POST /api/questions/bulk - Bulk import questions
router.post("/bulk", authenticateJWT, (req, res) =>
  questionController.createMany(req, res),
);

// PUT /api/questions/:id - Update an existing question
router.put("/:id", authenticateJWT, (req, res) =>
  questionController.update(req, res),
);

// DELETE /api/questions/:id - Soft delete a question
router.delete("/:id", authenticateJWT, (req, res) =>
  questionController.delete(req, res),
);

export default router;
