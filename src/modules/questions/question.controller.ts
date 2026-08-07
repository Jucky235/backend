import { Request, Response } from "express";
import { QuestionService } from "./question.service";

const questionService = new QuestionService();

export class QuestionController {
  /**
   * POST /api/questions
   * Create a single question
   */
  async create(req: Request, res: Response) {
    try {
      const {
        content,
        options,
        right_answer,
        category,
        partNumber,
        explanation,
      } = req.body;

      if (!content || !options || !right_answer) {
        return res.status(400).json({
          message:
            "Vui lòng cung cấp đầy đủ nội dung, đáp án và câu trả lời đúng.",
        });
      }

      const question = await questionService.createQuestion({
        content,
        options,
        right_answer,
        category,
        partNumber: partNumber ? Number(partNumber) : undefined,
        explanation,
      });

      return res.status(201).json(question);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi khi tạo câu hỏi.",
      });
    }
  }

  /**
   * POST /api/questions/bulk
   * Bulk import questions from CSV/JSON payload
   */
  async createMany(req: Request, res: Response) {
    try {
      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          message: "Danh sách câu hỏi nhập vào không hợp lệ hoặc rỗng.",
        });
      }

      const result = await questionService.createManyQuestions(questions);

      return res.status(201).json({
        message: `Đã nhập thành công ${result.count} câu hỏi.`,
        count: result.count,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi khi nhập danh sách câu hỏi.",
      });
    }
  }

  /**
   * GET /api/questions
   * Fetch all questions with filters & pagination
   */
  async getAll(req: Request, res: Response) {
    try {
      const { category, partNumber, status, search, page, limit } = req.query;

      const result = await questionService.getAllQuestions({
        category: category as string,
        partNumber: partNumber ? Number(partNumber) : undefined,
        status: (status as "ACTIVE" | "INACTIVE") || "ACTIVE",
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi hệ thống.",
      });
    }
  }

  /**
   * GET /api/questions/:id
   * Fetch a single question by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const question = await questionService.getQuestionById(id);
      return res.json(question);
    } catch (error: any) {
      if (error.message === "Question not found.") {
        return res.status(404).json({ message: "Không tìm thấy câu hỏi này." });
      }
      return res.status(500).json({ message: "Đã xảy ra lỗi hệ thống." });
    }
  }

  /**
   * PUT /api/questions/:id
   * Update question details
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedQuestion = await questionService.updateQuestion(
        id,
        req.body,
      );
      return res.json(updatedQuestion);
    } catch (error: any) {
      if (error.message === "Question not found.") {
        return res
          .status(404)
          .json({ message: "Không tìm thấy câu hỏi để cập nhật." });
      }
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi khi cập nhật câu hỏi.",
      });
    }
  }

  /**
   * DELETE /api/questions/:id
   * Soft delete question (sets status to INACTIVE)
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await questionService.deleteQuestion(id);
      return res.json({ message: "Đã xóa câu hỏi thành công." });
    } catch (error: any) {
      if (error.message === "Question not found.") {
        return res
          .status(404)
          .json({ message: "Không tìm thấy câu hỏi để xóa." });
      }
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi khi xóa câu hỏi.",
      });
    }
  }
}
