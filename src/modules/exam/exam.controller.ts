import { Request, Response } from "express";
import { ExamService } from "./exam.service";
import { type AuthenticatedRequest } from "../../middleware/auth";

const examService = new ExamService();

export class ExamController {
  // Fetch all active exams
  async getAll(req: Request, res: Response) {
    try {
      const exams = await examService.getAllExams();
      return res.json(exams);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error.message || "Đã xảy ra lỗi hệ thống." });
    }
  }

  // Fetch a specific exam by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const exam = await examService.getExamById(id);
      return res.json(exam);
    } catch (error: any) {
      if (error.message === "Exam not found") {
        return res.status(404).json({ message: "Không tìm thấy đề thi này." });
      }
      return res.status(500).json({ message: "Đã xảy ra lỗi hệ thống." });
    }
  }

  // Create a new exam with optional explicit parts and questions
  async create(req: Request, res: Response) {
    try {
      const {
        name,
        code,
        description,
        category,
        status,
        durationMinutes,
        parts,
        questions,
      } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          message: "Tên đề thi và danh mục không được để trống.",
        });
      }

      // Validate explicit parts input array structure
      if (Array.isArray(parts) && parts.length > 0) {
        const hasInvalidPart = parts.some(
          (p) => typeof p.partNumber !== "number" || p.partNumber < 1,
        );
        if (hasInvalidPart) {
          return res.status(400).json({
            message:
              "Danh sách Part không hợp lệ. Mỗi Part phải bao gồm partNumber là số nguyên dương.",
          });
        }
      }

      // Validate questions input array structure
      if (Array.isArray(questions) && questions.length > 0) {
        const hasInvalidQuestion = questions.some(
          (q) => !q.questionId || typeof q.sortOrder !== "number",
        );
        if (hasInvalidQuestion) {
          return res.status(400).json({
            message:
              "Danh sách câu hỏi không hợp lệ. Mỗi câu hỏi phải bao gồm questionId và sortOrder.",
          });
        }
      }

      const createdExam = await examService.createExam({
        name,
        code,
        description,
        category,
        status,
        durationMinutes,
        parts,
        questions,
      });

      return res.status(201).json(createdExam);
    } catch (error: any) {
      if (error.message?.includes("invalid or inactive question IDs")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi hệ thống khi tạo đề thi.",
      });
    }
  }

  // Add questions to an existing exam
  async addQuestions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { questions } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Mã đề thi không hợp lệ." });
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          message: "Danh sách câu hỏi thêm vào không được để trống.",
        });
      }

      const hasInvalidItem = questions.some((q) => !q.questionId);
      if (hasInvalidItem) {
        return res.status(400).json({
          message:
            "Cấu trúc danh sách câu hỏi không hợp lệ. Mỗi mục phải có questionId.",
        });
      }

      const updatedExam = await examService.addQuestionsToExam({
        examId: id,
        questions,
      });

      return res.status(200).json(updatedExam);
    } catch (error: any) {
      if (error.message === "Exam not found.") {
        return res.status(404).json({ message: "Không tìm thấy đề thi này." });
      }
      if (
        error.message?.includes("invalid or inactive question IDs") ||
        error.message === "No questions provided to add."
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({
        message:
          error.message ||
          "Đã xảy ra lỗi hệ thống khi thêm câu hỏi vào đề thi.",
      });
    }
  }

  // Submit exam attempt and save history snapshot
  async submitExam(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId, answers, startedAt, submittedAt } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Người dùng chưa xác thực." });
      }

      if (!examId || !answers || !startedAt || !submittedAt) {
        return res.status(400).json({ message: "Thiếu thông tin nộp bài." });
      }

      const history = await examService.saveExamHistory({
        userId,
        examId,
        answers,
        startedAt,
        submittedAt,
      });

      return res.status(201).json(history);
    } catch (error: any) {
      if (error.message === "Exam not found") {
        return res.status(404).json({ message: "Không tìm thấy đề thi này." });
      }
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi hệ thống khi nộp bài.",
      });
    }
  }
}
