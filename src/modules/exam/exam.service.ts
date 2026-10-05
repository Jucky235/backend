import { prisma } from "../../config/db";
import { ExamStatus, ExamCategory, Prisma } from "@prisma/client";

export interface CreateExamQuestionInput {
  questionId: number;
  sortOrder: number;
  partNumber: number;
}

export interface CreateExamPartInput {
  partNumber: number;
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateExamInput {
  name: string;
  code?: string;
  description?: string;
  category: ExamCategory;
  status?: ExamStatus;
  durationMinutes?: number;
  parts?: CreateExamPartInput[];
  questions?: CreateExamQuestionInput[];
}

export interface AddQuestionsToExamPayload {
  questionId: number;
  partNumber?: number;
  sortOrder?: number;
}

export interface AddQuestionsToExamInput {
  examId: number;
  questions: AddQuestionsToExamPayload[];
}

export interface SaveExamHistoryInput {
  userId: number;
  examId: number;
  answers: Record<number | string, string>;
  startedAt: string | Date;
  submittedAt: string | Date;
}

export class ExamService {
  // Fetch all active exams
  async getAllExams() {
    return prisma.exam.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fetch a specific exam with active questions flattened across all parts
  async getExamById(
    id: number | string,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      throw new Error("Invalid Exam ID format.");
    }

    const exam = await client.exam.findUnique({
      where: { id: numericId },
      include: {
        parts: {
          orderBy: { sortOrder: "asc" },
          include: {
            questions: {
              orderBy: { sortOrder: "asc" },
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    // Flatten questions across all parts while attaching part metadata
    const activeQuestions = exam.parts.flatMap((part) =>
      part.questions
        .filter((eq) => eq.question.status === "ACTIVE")
        .map((eq) => ({
          ...eq.question,
          sortOrder: eq.sortOrder,
          partNumber: part.partNumber,
          partId: part.id,
        })),
    );

    const { parts, ...examData } = exam;

    return {
      ...examData,
      questions: activeQuestions,
      parts,
    };
  }
  // Create a new exam along with explicit user parts and question associations
  async createExam(data: CreateExamInput) {
    const {
      name,
      code,
      description,
      category,
      status = "ACTIVE",
      durationMinutes = 60,
      parts = [],
      questions = [],
    } = data;

    // 1. Validate provided question IDs
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
      // 2. Create the Exam
      const newExam = await tx.exam.create({
        data: {
          name,
          code,
          description,
          category,
          status,
          time: durationMinutes,
        },
      });

      // 3. Group questions by partNumber
      const questionsByPart = questions.reduce<
        Record<number, CreateExamQuestionInput[]>
      >((acc, q) => {
        const partNum = q.partNumber || 1;
        if (!acc[partNum]) acc[partNum] = [];
        acc[partNum].push(q);
        return acc;
      }, {});

      // 4. Combine explicit user parts and parts derived from questions
      const userPartNumbers = new Set(parts.map((p) => p.partNumber));
      const questionPartNumbers = Object.keys(questionsByPart).map(Number);

      const allPartNumbers = Array.from(
        new Set([...userPartNumbers, ...questionPartNumbers]),
      ).sort((a, b) => a - b);

      // 5. Create each ExamPart and attach associated questions
      for (const partNumber of allPartNumbers) {
        const customPartConfig = parts.find((p) => p.partNumber === partNumber);
        const partQuestions = questionsByPart[partNumber] || [];

        await tx.examPart.create({
          data: {
            examId: newExam.id,
            partNumber: partNumber,
            name: customPartConfig?.name || `Part ${partNumber}`,
            description: customPartConfig?.description,
            sortOrder: customPartConfig?.sortOrder ?? partNumber,
            questions: {
              create: partQuestions.map((q) => ({
                questionId: q.questionId,
                sortOrder: q.sortOrder,
              })),
            },
          },
        });
      }

      return this.getExamById(newExam.id, tx);
    });
  }

  // Add new questions to an existing exam
  async addQuestionsToExam(data: AddQuestionsToExamInput) {
    const { examId, questions } = data;

    if (!questions || questions.length === 0) {
      throw new Error("No questions provided to add.");
    }

    // Parse examId to Int for Prisma querying
    const parsedExamId =
      typeof examId === "string" ? parseInt(examId, 10) : examId;

    if (isNaN(parsedExamId)) {
      throw new Error("Invalid Exam ID provided.");
    }

    // 1. Verify existence of the exam and fetch existing parts
    const exam = await prisma.exam.findUnique({
      where: { id: parsedExamId },
      include: {
        parts: {
          include: {
            questions: {
              select: { questionId: true, sortOrder: true },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found.");
    }

    // 2. Validate all provided question IDs exist and are active
    const questionIds = Array.from(new Set(questions.map((q) => q.questionId)));
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

    // 3. Process addition within a transaction
    return prisma.$transaction(async (tx) => {
      const questionsByPart = questions.reduce<
        Record<number, AddQuestionsToExamPayload[]>
      >((acc, q) => {
        const partNum = q.partNumber || 1;
        if (!acc[partNum]) acc[partNum] = [];
        acc[partNum].push(q);
        return acc;
      }, {});

      for (const [partNumStr, targetQuestions] of Object.entries(
        questionsByPart,
      )) {
        const partNumber = Number(partNumStr);

        let targetPart = exam.parts.find((p) => p.partNumber === partNumber);

        if (!targetPart) {
          targetPart = await tx.examPart.create({
            data: {
              examId: exam.id,
              partNumber: partNumber,
              name: `Part ${partNumber}`,
              sortOrder: partNumber,
            },
            include: {
              questions: { select: { questionId: true, sortOrder: true } },
            },
          });
        }

        const currentPartQuestions = await tx.examQuestion.findMany({
          where: { partId: targetPart.id },
          select: { questionId: true, sortOrder: true },
        });

        const existingQuestionIdsInPart = new Set(
          currentPartQuestions.map((eq) => eq.questionId),
        );

        const newQuestionsForPart = targetQuestions.filter(
          (q) => !existingQuestionIdsInPart.has(q.questionId),
        );

        if (newQuestionsForPart.length > 0) {
          const maxSortOrder =
            currentPartQuestions.length > 0
              ? Math.max(...currentPartQuestions.map((q) => q.sortOrder ?? 0))
              : 0;

          await tx.examQuestion.createMany({
            data: newQuestionsForPart.map((q, index) => ({
              partId: targetPart.id,
              questionId: q.questionId,
              sortOrder: q.sortOrder ?? maxSortOrder + index + 1,
            })),
            skipDuplicates: true,
          });
        }
      }

      return this.getExamById(exam.id, tx);
    });
  }
  // Save student attempt history and freeze snapshot
  async saveExamHistory(data: SaveExamHistoryInput) {
    const { userId, examId, answers, startedAt, submittedAt } = data;

    const numericExamId = Number(examId);

    const exam = await prisma.exam.findUnique({
      where: { id: numericExamId },
      include: {
        parts: {
          include: {
            questions: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!exam) throw new Error("Exam not found");

    const activeQuestions = exam.parts.flatMap((part) =>
      part.questions
        .filter((eq) => eq.question.status === "ACTIVE")
        .map((eq) => ({
          ...eq,
          partNumber: part.partNumber,
        })),
    );

    const totalQuestions = activeQuestions.length;
    let correctQuestions = 0;

    const historyAnswersSnapshot = activeQuestions.map((eq) => {
      const q = eq.question;
      const userAnswer = answers[q.id] || "";
      const isCorrect = userAnswer === q.right_answer;

      if (isCorrect) correctQuestions++;

      return {
        questionId: q.id,
        content: q.content,
        options: q.options,
        right_answer: q.right_answer,
        userAnswer,
        isCorrect,
        explanation: q.explanation,
        sortOrder: eq.sortOrder,
        partNumber: eq.partNumber,
      };
    });

    const score = correctQuestions;
    const isPassed = totalQuestions > 0 ? score / totalQuestions >= 0.5 : false;

    const start = new Date(startedAt).getTime();
    const end = new Date(submittedAt).getTime();
    const timeTakenSeconds = Math.max(0, Math.floor((end - start) / 1000));

    return prisma.examHistory.create({
      data: {
        userId,
        examId: numericExamId,
        score,
        totalQuestions,
        correctQuestions,
        isPassed,
        answers: historyAnswersSnapshot as unknown as Prisma.InputJsonValue,
        startedAt: new Date(startedAt),
        submittedAt: new Date(submittedAt),
        timeTakenSeconds,
      },
    });
  }

  async getTodayDailyExam() {
    // Generate ISO date string (YYYY-MM-DD) in local server time zone
    const todayStr = new Date().toLocaleDateString("en-CA"); // Formats as YYYY-MM-DD
    const targetExamName = `Daily TOEIC Test - ${todayStr}`;

    // 1. Try finding today's specific daily exam
    let dailyExam = await prisma.exam.findFirst({
      where: {
        OR: [{ name: { contains: todayStr } }, { name: targetExamName }],
        status: ExamStatus.ACTIVE,
      },
    });

    // 2. Fallback: If today's exam hasn't been auto-generated, return the latest active DAILY/TOEIC exam
    if (!dailyExam) {
      dailyExam = await prisma.exam.findFirst({
        where: {
          category: ExamCategory.TOEIC,
          status: ExamStatus.ACTIVE,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // 3. Throw explicit, catchable error if database has no active exams
    if (!dailyExam) {
      const error = new Error("No active daily exam available.");
      (error as any).statusCode = 404;
      throw error;
    }

    return dailyExam;
  }
}
