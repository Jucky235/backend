import { prisma } from "../../config/db";

export class ExamService {
  // Fetch all exams (omitting questions for a lightweight list)
  async getAllExams() {
    return prisma.exam.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  // Fetch a specific exam, drilling through the join table to get active questions
  async getExamById(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            sortOrder: "asc", // Ensures questions are ordered chronologically (Q1, Q2, Q3...)
          },
          include: {
            question: true, // Crucial: This fetches the actual fields like content, options, right_answer
          },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    // Optional but highly recommended cleanup step:
    // Filter out questions where the underlying question status is INACTIVE,
    // and flatten the response layout so your frontend doesn't have to map through a nested array.
    const activeQuestions = exam.questions
      .filter((eq) => eq.question.status === "ACTIVE")
      .map((eq) => ({
        ...eq.question,
        sortOrder: eq.sortOrder, // Injecting join-table metadata into the object
        partNumber: eq.partNumber, // Injecting join-table metadata into the object
      }));

    return {
      ...exam,
      questions: activeQuestions, // Replaces nested structure with a clean, flat array of questions
    };
  }

  async saveExamHistory(data: {
    userId: string;
    examId: string;
    answers: Record<string, string>; // e.g., { "question-uuid-1": "A", "question-uuid-2": "B" }
    startedAt: string;
    submittedAt: string;
  }) {
    // 1. Fetch the exam questions to verify answers and take a structural snapshot
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

    // 2. Evaluate answers and assemble the frozen history snapshot
    activeQuestions.forEach((eq) => {
      const q = eq.question;
      const userAnswer = data.answers[q.id] || "";
      const isCorrect = userAnswer === q.right_answer;

      if (isCorrect) correctQuestions++;

      // Snapshot prevents history corruption if an admin edits the question later
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

    // Simple placeholder grading logic (e.g., pass if score is >= 50%)
    const score = correctQuestions;
    const isPassed = totalQuestions > 0 ? score / totalQuestions >= 0.5 : false;

    // Calculate time taken
    const start = new Date(data.startedAt).getTime();
    const end = new Date(data.submittedAt).getTime();
    const timeTakenSeconds = Math.max(0, Math.floor((end - start) / 1000));

    // 3. Save into database
    return prisma.examHistory.create({
      data: {
        userId: data.userId,
        examId: data.examId,
        score,
        totalQuestions,
        correctQuestions,
        isPassed,
        answers: historyAnswersSnapshot, // Saves the complete frozen context
        startedAt: new Date(data.startedAt),
        submittedAt: new Date(data.submittedAt),
        timeTakenSeconds,
      },
    });
  }
}
