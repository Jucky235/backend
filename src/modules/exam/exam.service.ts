import { prisma } from "../../config/db";
import { ExamStatus, ExamCategory, Prisma } from "@prisma/client";

export interface CreateExamQuestionInput {
  questionId: string;
  sortOrder: number;
  partNumber: number; // Links question to a specific part
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
  parts?: CreateExamPartInput[]; // Explicit user-defined parts
  questions?: CreateExamQuestionInput[];
}

export interface AddQuestionsToExamPayload {
  questionId: string;
  partNumber?: number;
  sortOrder?: number;
}

export interface AddQuestionsToExamInput {
  examId: string;
  questions: AddQuestionsToExamPayload[];
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
    id: string,
    client: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    const exam = await client.exam.findUnique({
      where: { id },
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
      parts, // Keep original parts metadata in payload
    };
  }

  // Create a new exam along with explicit user parts and question associations
  async createExam(data: CreateExamInput) {
    const {
      name,
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

      // Merge all distinct part numbers needed
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

      // Fetch complete created exam structure
      return this.getExamById(newExam.id, tx);
    });
  }

  /**
   * Add new questions to an existing exam.
   * Auto-creates ExamPart if the targeted partNumber does not exist yet.
   */
  async addQuestionsToExam(data: AddQuestionsToExamInput) {
    const { examId, questions } = data;

    if (!questions || questions.length === 0) {
      throw new Error("No questions provided to add.");
    }

    // 1. Verify existence of the exam and fetch existing parts
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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
      // Group incoming questions by part number
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

        // Find existing part or auto-create one
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

        // Fetch current questions for accuracy within transaction scope
        const currentPartQuestions = await tx.examQuestion.findMany({
          where: { partId: targetPart.id },
          select: { questionId: true, sortOrder: true },
        });

        // Set of question IDs currently in this specific part
        const existingQuestionIdsInPart = new Set(
          currentPartQuestions.map((eq) => eq.questionId),
        );

        // Filter out questions already present in this part
        const newQuestionsForPart = targetQuestions.filter(
          (q) => !existingQuestionIdsInPart.has(q.questionId),
        );

        if (newQuestionsForPart.length > 0) {
          // Calculate max sortOrder using actual saved sort orders
          const maxSortOrder =
            currentPartQuestions.length > 0
              ? Math.max(...currentPartQuestions.map((q) => q.sortOrder ?? 0))
              : 0;

          await tx.examQuestion.createMany({
            data: newQuestionsForPart.map((q, index) => ({
              partId: targetPart.id, // Correct key matching schema relation
              questionId: q.questionId,
              sortOrder: q.sortOrder ?? maxSortOrder + index + 1,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Return updated complete exam object
      return this.getExamById(exam.id, tx);
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
