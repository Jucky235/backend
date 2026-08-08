import { prisma } from "../../config/db";
import { ExamStatus, ExamCategory } from "@prisma/client";

export interface CreateExamQuestionInput {
  questionId: string;
  sortOrder: number;
  partNumber?: number;
}

export interface CreateExamInput {
  name: string;
  code?: string;
  description?: string;
  category: ExamCategory;
  status?: ExamStatus;
  durationMinutes?: number;
  questions?: CreateExamQuestionInput[];
}

export class ExamService {
  // Fetch all active exams
  async getAllExams() {
    return prisma.exam.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fetch a specific exam with active questions flattened
  async getExamById(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            question: true,
          },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    const activeQuestions = exam.questions
      .filter((eq) => eq.question.status === "ACTIVE")
      .map((eq) => ({
        ...eq.question,
        sortOrder: eq.sortOrder,
        partNumber: eq.partNumber,
      }));

    return {
      ...exam,
      questions: activeQuestions,
    };
  }

  // Create a new exam along with question associations in a single transaction
  async createExam(data: CreateExamInput) {
    const {
      name,
      description,
      category,
      status = "ACTIVE",
      durationMinutes = 60, // Default to 60 minutes if undefined to fulfill non-nullable 'time' field
      questions = [],
    } = data;

    // Validate that provided question IDs exist and are active
    if (questions.length > 0) {
      const questionIds = questions.map((q) => q.questionId);
      const existingQuestions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (existingQuestions.length !== questionIds.length) {
        const existingSet = new Set(existingQuestions.map((q) => q.id));
        const invalidIds = questionIds.filter((id) => !existingSet.has(id));
        throw new Error(
          `One or more invalid or inactive question IDs: ${invalidIds.join(", ")}`,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const newExam = await tx.exam.create({
        data: {
          name,
          category,
          status,
          time: durationMinutes,
          questions: {
            create: questions.map((q) => ({
              questionId: q.questionId,
              sortOrder: q.sortOrder,
              partNumber: q.partNumber,
            })),
          },
        },
        include: {
          questions: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              question: true,
            },
          },
        },
      });

      const formattedQuestions = newExam.questions.map((eq) => ({
        ...eq.question,
        sortOrder: eq.sortOrder,
        partNumber: eq.partNumber,
      }));

      return {
        ...newExam,
        questions: formattedQuestions,
      };
    });
  }

  // Save student attempt history and freeze snapshot
  async saveExamHistory(data: {
    userId: string;
    examId: string;
    answers: Record<string, string>;
    startedAt: string;
    submittedAt: string;
  }) {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: {
        questions: {
          include: { question: true },
        },
      },
    });

    if (!exam) throw new Error("Exam not found");

    const activeQuestions = exam.questions.filter(
      (eq) => eq.question.status === "ACTIVE",
    );
    const totalQuestions = activeQuestions.length;

    let correctQuestions = 0;
    const historyAnswersSnapshot: any[] = [];

    activeQuestions.forEach((eq) => {
      const q = eq.question;
      const userAnswer = data.answers[q.id] || "";
      const isCorrect = userAnswer === q.right_answer;

      if (isCorrect) correctQuestions++;

      historyAnswersSnapshot.push({
        questionId: q.id,
        content: q.content,
        options: q.options,
        right_answer: q.right_answer,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        explanation: q.explanation,
        sortOrder: eq.sortOrder,
        partNumber: eq.partNumber,
      });
    });

    const score = correctQuestions;
    const isPassed = totalQuestions > 0 ? score / totalQuestions >= 0.5 : false;

    const start = new Date(data.startedAt).getTime();
    const end = new Date(data.submittedAt).getTime();
    const timeTakenSeconds = Math.max(0, Math.floor((end - start) / 1000));

    return prisma.examHistory.create({
      data: {
        userId: data.userId,
        examId: data.examId,
        score,
        totalQuestions,
        correctQuestions,
        isPassed,
        answers: historyAnswersSnapshot,
        startedAt: new Date(data.startedAt),
        submittedAt: new Date(data.submittedAt),
        timeTakenSeconds,
      },
    });
  }
}
