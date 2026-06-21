import { PrismaClient } from "@prisma/client";
import { prisma } from "../../config/db";

export class ExamService {
  // Fetch all exams (omitting questions for a lightweight list)
  async getAllExams() {
    return prisma.exam.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fetch a specific exam along with its 4 (or more) linked questions
  async getExamById(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    return exam;
  }
}
