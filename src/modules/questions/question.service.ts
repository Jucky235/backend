import { prisma } from "../../config/db";
import { ExamCategory } from "@prisma/client";

export interface CreateQuestionInput {
  content: string;
  options: Record<string, string>; // e.g. { A: "...", B: "...", C: "...", D: "..." }
  right_answer: "A" | "B" | "C" | "D";
  category?: ExamCategory;
  partNumber?: number;
  explanation?: string;
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {
  status?: "ACTIVE" | "INACTIVE";
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
    } = data;

    if (!content || !options || !right_answer) {
      throw new Error("Missing required question fields.");
    }

    return prisma.question.create({
      data: {
        content,
        options,
        right_answer,
        category,
        partNumber,
        explanation,
        status: "ACTIVE",
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
      options: q.options,
      right_answer: q.right_answer,
      category: q.category || "TOEIC",
      partNumber: q.partNumber || 1,
      explanation: q.explanation || "",
      status: "ACTIVE",
    }));

    return prisma.question.createMany({
      data: payload,
      skipDuplicates: false,
    });
  }

  /**
   * Fetch all questions with optional filters and pagination
   */
  async getAllQuestions(params?: {
    category?: string;
    partNumber?: number;
    status?: "ACTIVE" | "INACTIVE";
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      category,
      partNumber,
      status = "ACTIVE",
      search,
      page = 1,
      limit = 20,
    } = params || {};

    const where: any = {};

    if (status) where.status = status;
    if (category && category !== "ALL") where.category = category;
    if (partNumber) where.partNumber = Number(partNumber);
    if (search) {
      where.content = {
        contains: search,
        mode: "insensitive",
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single question by ID
   */
  async getQuestionById(id: string) {
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new Error("Question not found.");
    }

    return question;
  }

  /**
   * Update question content, options, or metadata
   */
  async updateQuestion(id: string, data: UpdateQuestionInput) {
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Question not found.");
    }

    return prisma.question.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  /**
   * Soft delete a question by setting its status to INACTIVE
   */
  async deleteQuestion(id: string) {
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Question not found.");
    }

    return prisma.question.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
  }
}
