import { Request, Response } from "express";
import { ExamService } from "./exam.service";

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
}
