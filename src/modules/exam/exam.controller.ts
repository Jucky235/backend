import { Request, Response } from "express";
import { ExamService } from "./exam.service";
import { type AuthenticatedRequest } from "../../middleware/auth";

const examService = new ExamService();

export class ExamController {
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

  async create(req: Request, res: Response) {
    try {
      const {
        name,
        code,
        description,
        category,
        status,
        durationMinutes,
        questions,
      } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          message: "Tên đề thi và danh mục không được để trống.",
        });
      }

      const createdExam = await examService.createExam({
        name,
        code,
        description,
        category,
        status,
        durationMinutes,
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
