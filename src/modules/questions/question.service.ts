import { prisma } from "../../config/db";
import { ExamCategory, QuestionStatus, Prisma } from "@prisma/client";

export interface CreateQuestionInput {
  content: string;
  options: Record<string, string>; // e.g. { A: "...", B: "...", C: "...", D: "..." }
  right_answer: "A" | "B" | "C" | "D" | string;
  category?: ExamCategory;
  partNumber?: number;
  explanation?: string;
  imagePath?: string;
  audioPath?: string;
  topicNumber?: number;
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {
  status?: QuestionStatus;
}

export interface GetQuestionsParams {
  category?: string;
  partNumber?: number;
  status?: QuestionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class QuestionService {
  /**
   * Create a single question record in the database
   */
  async createQuestion(data: CreateQuestionInput) {
    const {
      content,
      options,
      right_answer,
      category = ExamCategory.TOEIC,
      partNumber = 1,
      explanation = "",
      imagePath,
      audioPath,
      topicNumber,
    } = data;

    if (!content || !options || !right_answer) {
      throw new Error("Missing required question fields.");
    }

    return prisma.question.create({
      data: {
        content,
        options: options as unknown as Prisma.InputJsonValue,
        right_answer,
        category,
        partNumber,
        explanation,
        imagePath,
        audioPath,
        topicNumber,
        status: QuestionStatus.ACTIVE,
      },
    });
  }

  /**
   * Create multiple questions in a single transaction (used by CSV Bulk Import)
   */
  async createManyQuestions(questions: CreateQuestionInput[]) {
    if (!questions || questions.length === 0) {
      throw new Error("No questions provided for bulk import.");
    }

    const payload = questions.map((q) => ({
      content: q.content,
      options: q.options as unknown as Prisma.InputJsonValue,
      right_answer: q.right_answer,
      category: q.category || ExamCategory.TOEIC,
      partNumber: q.partNumber || 1,
      explanation: q.explanation || "",
      imagePath: q.imagePath,
      audioPath: q.audioPath,
      topicNumber: q.topicNumber,
      status: QuestionStatus.ACTIVE,
    }));

    return prisma.question.createMany({
      data: payload,
      skipDuplicates: false,
    });
  }

  /**
   * Fetch all questions with optional filters and pagination
   */
  async getAllQuestions(params?: GetQuestionsParams) {
    const {
      category,
      partNumber,
      status = QuestionStatus.ACTIVE,
      search,
      page = 1,
      limit = 20,
    } = params || {};

    const where: Prisma.QuestionWhereInput = {};

    if (status) where.status = status;
    if (category && category !== "ALL")
      where.category = category as ExamCategory;
    if (partNumber) where.partNumber = Number(partNumber);
    if (search) {
      where.content = {
        contains: search,
        mode: "insensitive",
      };
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.question.count({ where }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(id: number) {
    const numericId = Number(id);
    const question = await prisma.question.findUnique({
      where: { id: numericId },
    });

    if (!question) {
      throw new Error("Question not found.");
    }

    return question;
  }

  /**
   * Update question content, options, or metadata
   */
  async updateQuestion(id: number, data: UpdateQuestionInput) {
    const numericId = Number(id);
    const existing = await prisma.question.findUnique({
      where: { id: numericId },
    });
    if (!existing) {
      throw new Error("Question not found.");
    }

    const { options, ...restData } = data;

    return prisma.question.update({
      where: { id: numericId },
      data: {
        ...restData,
        ...(options && {
          options: options as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  /**
   * Soft delete a question by setting its status to INACTIVE
   */
  async deleteQuestion(id: number) {
    const numericId = Number(id);
    const existing = await prisma.question.findUnique({
      where: { id: numericId },
    });
    if (!existing) {
      throw new Error("Question not found.");
    }

    return prisma.question.update({
      where: { id: numericId },
      data: { status: QuestionStatus.INACTIVE },
    });
  }
}
