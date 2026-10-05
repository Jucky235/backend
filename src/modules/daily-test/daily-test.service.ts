import { Trino } from "trino-client";

import { prisma } from "../../config/db";
import {
  QuestionGeneratorService,
  type SkillGenerationInput,
} from "./ai/question-generator.service";

const trino = Trino.create({
  server: "http://localhost:8080",
  catalog: "iceberg",
  schema: "analytics",
  user: "admin",
});

const questionGenerator = new QuestionGeneratorService();

type CommunityWeakSkillRow = {
  skill_id: number;
  skill_name: string;
  community_accuracy: number | string;
  total_attempted_questions: number | string;
  total_answered_questions: number | string;
  community_confidence: number | string;
};

async function executeQuery(query: string): Promise<any[]> {
  const iter = await trino.query({ query });

  const rows: any[] = [];
  let columns: string[] = [];

  for await (const res of iter) {
    if (res.columns && columns.length === 0) {
      columns = res.columns.map((column: any) => column.name);
    }

    if (res.data) {
      for (const row of res.data) {
        if (Array.isArray(row)) {
          const mappedRow: Record<string, any> = {};

          columns.forEach((column, index) => {
            mappedRow[column] = row[index];
          });

          rows.push(mappedRow);
        } else {
          rows.push(row);
        }
      }
    }
  }

  return rows;
}

export async function generateDailyTest() {
  console.log("Starting daily TOEIC test generation...");

  const weakSkillRows = (await executeQuery(`
    SELECT
        skill_id,
        skill_name,
        community_accuracy,
        total_attempted_questions,
        total_answered_questions,
        community_confidence
    FROM iceberg.analytics.community_skill_performance
    ORDER BY community_accuracy ASC
    LIMIT 5
  `)) as CommunityWeakSkillRow[];

  console.log("Weak skill rows returned:", weakSkillRows.length);

  if (weakSkillRows.length !== 5) {
    throw new Error(`Expected 5 weak skills, received ${weakSkillRows.length}`);
  }

  console.log(
    "Weak skills:",
    weakSkillRows.map((skill) => ({
      id: skill.skill_id,
      name: skill.skill_name,
      accuracy: skill.community_accuracy,
      attempted: skill.total_attempted_questions,
      confidence: skill.community_confidence,
    })),
  );

  const skillIds = weakSkillRows.map((skill) => skill.skill_id);

  if (skillIds.some((skillId) => skillId === undefined || skillId === null)) {
    throw new Error(
      `Invalid skill IDs returned from Trino: ${JSON.stringify(skillIds)}`,
    );
  }

  const skills = await prisma.skill.findMany({
    where: {
      id: {
        in: skillIds,
      },
    },
    include: {
      parent: true,
      questions: {
        include: {
          question: {
            select: {
              partNumber: true,
            },
          },
        },
      },
    },
  });

  if (skills.length !== 5) {
    throw new Error(`Expected 5 skills from Prisma, received ${skills.length}`);
  }

  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

  const generationSkills: SkillGenerationInput[] = weakSkillRows.map(
    (weakSkill) => {
      const skill = skillsById.get(weakSkill.skill_id);

      if (!skill) {
        throw new Error(`Skill ${weakSkill.skill_id} was not found in Prisma`);
      }

      const validParts = Array.from(
        new Set(
          skill.questions
            .map((questionSkill) => questionSkill.question.partNumber)
            .filter(
              (partNumber): partNumber is number =>
                partNumber !== null && partNumber >= 1 && partNumber <= 7,
            ),
        ),
      ).sort((a, b) => a - b);

      if (validParts.length === 0) {
        throw new Error(
          `Skill ${skill.id} (${skill.name}) has no existing questions with a valid partNumber`,
        );
      }

      return {
        skillId: skill.id,
        skillName: skill.name,
        description: skill.description,
        category: skill.category,
        parentSkillName: skill.parent?.name ?? null,
        validParts,
      };
    },
  );

  console.log(
    "Generation skills:",
    generationSkills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      parentSkillName: skill.parentSkillName,
      category: skill.category,
      validParts: skill.validParts,
    })),
  );

  console.log("🤖 Generating 25 questions with Groq...");

  const generatedQuestions =
    await questionGenerator.generateQuestions(generationSkills);

  console.log(`🤖 Groq generated ${generatedQuestions.length} questions`);

  if (generatedQuestions.length !== 25) {
    throw new Error(
      `Expected 25 generated questions, received ${generatedQuestions.length}`,
    );
  }

  for (let index = 0; index < generatedQuestions.length; index++) {
    const question = generatedQuestions[index];

    if (question.partNumber < 1 || question.partNumber > 7) {
      throw new Error(
        `Generated question ${index + 1} has invalid partNumber: ${question.partNumber}`,
      );
    }

    const skillExists = generationSkills.some(
      (skill) => skill.skillId === question.skillId,
    );

    if (!skillExists) {
      throw new Error(
        `Generated question ${index + 1} references unknown skillId: ${question.skillId}`,
      );
    }
  }

  const questionCountBySkill = new Map<number, number>();

  for (const question of generatedQuestions) {
    questionCountBySkill.set(
      question.skillId,
      (questionCountBySkill.get(question.skillId) ?? 0) + 1,
    );
  }

  for (const skill of generationSkills) {
    const count = questionCountBySkill.get(skill.skillId) ?? 0;

    if (count !== 5) {
      throw new Error(
        `Expected 5 questions for skill ${skill.skillId} (${skill.skillName}), received ${count}`,
      );
    }
  }

  const today = new Date();
  const dateString = today.toISOString().slice(0, 10);
  const examName = `Daily TOEIC Test - ${dateString}`;

  const existingExam = await prisma.exam.findFirst({
    where: {
      name: examName,
      category: "TOEIC",
    },
  });

  if (existingExam) {
    console.log(`Daily test already exists: ${existingExam.id}`);

    return {
      exam: existingExam,
      alreadyExists: true,
      generatedQuestionCount: 0,
    };
  }

  const usedParts = Array.from(
    new Set(generatedQuestions.map((question) => question.partNumber)),
  ).sort((a, b) => a - b);

  if (usedParts.length === 0) {
    throw new Error("Generated questions contain no valid TOEIC parts");
  }

  console.log("Used TOEIC parts:", usedParts);

  const exam = await prisma.$transaction(
    async (tx) => {
      const createdExam = await tx.exam.create({
        data: {
          name: examName,
          category: "TOEIC",
          time: 60,
          status: "ACTIVE",
        },
      });

      const examParts = new Map<number, { id: string }>();

      for (let index = 0; index < usedParts.length; index++) {
        const partNumber = usedParts[index];

        const examPart = await tx.examPart.create({
          data: {
            examId: createdExam.id,
            partNumber,
            name: `Part ${partNumber}`,
            instructions: getPartInstructions(partNumber),
            sortOrder: index + 1,
          },
        });

        examParts.set(partNumber, {
          id: examPart.id,
        });
      }

      for (let index = 0; index < generatedQuestions.length; index++) {
        const generatedQuestion = generatedQuestions[index];

        const examPart = examParts.get(generatedQuestion.partNumber);

        if (!examPart) {
          throw new Error(
            `No ExamPart found for Part ${generatedQuestion.partNumber}`,
          );
        }

        const question = await tx.question.create({
          data: {
            content: generatedQuestion.content,
            options: generatedQuestion.options,
            right_answer: generatedQuestion.rightAnswer,
            category: "TOEIC",
            partNumber: generatedQuestion.partNumber,
            explanation: generatedQuestion.explanation,
            status: "ACTIVE",
          },
        });

        await tx.questionSkill.create({
          data: {
            questionId: question.id,
            skillId: generatedQuestion.skillId,
          },
        });

        await tx.examQuestion.create({
          data: {
            partId: examPart.id,
            questionId: question.id,
            sortOrder: index + 1,
          },
        });
      }

      return createdExam;
    },
    {
      maxWait: 30_000,
      timeout: 120_000,
    },
  );

  console.log(`✅ Daily TOEIC test created successfully: ${exam.id}`);

  return {
    exam,
    alreadyExists: false,
    generatedQuestionCount: 25,
    weakSkills: generationSkills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skillName,
      parentSkillName: skill.parentSkillName,
      validParts: skill.validParts,
    })),
  };
}

function getPartInstructions(partNumber: number): string {
  switch (partNumber) {
    case 1:
      return "Look at the photograph and choose the statement that best describes what you see.";

    case 2:
      return "Listen to the question or statement and choose the most appropriate response.";

    case 3:
      return "Listen to each conversation and answer the questions that follow.";

    case 4:
      return "Listen to each short talk and answer the questions that follow.";

    case 5:
      return "Choose the word or phrase that best completes the sentence.";

    case 6:
      return "Read the text and choose the word, phrase, or sentence that best completes each blank.";

    case 7:
      return "Read the passages and answer the questions that follow.";

    default:
      throw new Error(`Invalid TOEIC part number: ${partNumber}`);
  }
}
