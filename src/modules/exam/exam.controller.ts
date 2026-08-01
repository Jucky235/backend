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

  async submitExam(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId, answers, startedAt, submittedAt } = req.body;

      // ⚠️ Note: Replace this hardcoded ID with your actual auth middleware value (e.g., req.user.id)
      console.log(req);
      const userId = req.user.id;

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
        return res.status(444).json({ message: "Không tìm thấy đề thi này." });
      }
      return res.status(500).json({
        message: error.message || "Đã xảy ra lỗi hệ thống khi nộp bài.",
      });
    }
  }
}
