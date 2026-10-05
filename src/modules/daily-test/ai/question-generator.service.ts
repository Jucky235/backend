import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const QUESTIONS_PER_SKILL = 5;
const TOTAL_QUESTIONS = 25;
const MAX_GENERATION_ATTEMPTS = 3;

const GeneratedQuestionSchema = z.object({
  skillId: z.number().int().positive(),
  partNumber: z.number().int().min(1).max(7),
  content: z.string().min(1),
  options: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
  }),
  rightAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(1),
});

const GeneratedQuestionsSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export type SkillGenerationInput = {
  skillId: number;
  skillName: string;
  description: string | null;
  category: string;
  parentSkillName: string | null;
  validParts: number[];
};

export class QuestionGeneratorService {
  async generateQuestions(
    skills: SkillGenerationInput[],
  ): Promise<GeneratedQuestion[]> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    if (skills.length !== 5) {
      throw new Error(`Expected exactly 5 skills, received ${skills.length}`);
    }

    console.log(
      `Generating ${TOTAL_QUESTIONS} questions using Groq model: ${MODEL}`,
    );

    const allQuestions: GeneratedQuestion[] = [];

    for (let index = 0; index < skills.length; index++) {
      const skill = skills[index];

      console.log(
        `🤖 Generating skill ${index + 1}/${skills.length}: ${skill.skillName} (${QUESTIONS_PER_SKILL} questions)...`,
      );

      const skillQuestions = await this.generateSkillQuestions(skill);

      allQuestions.push(...skillQuestions);

      console.log(
        `✅ Skill ${skill.skillId} generated ${skillQuestions.length}/${QUESTIONS_PER_SKILL} questions`,
      );
    }

    this.validateFinalQuestionSet(allQuestions, skills);

    console.log(
      `✅ Generated complete daily test: ${allQuestions.length}/${TOTAL_QUESTIONS} questions`,
    );

    return allQuestions;
  }

  private async generateSkillQuestions(
    skill: SkillGenerationInput,
  ): Promise<GeneratedQuestion[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        console.log(
          `🤖 Skill ${skill.skillId} generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}...`,
        );

        const questions = await this.generateSkillAttempt(skill, attempt);

        console.log(
          `✅ Skill ${skill.skillId} attempt ${attempt} produced ${questions.length}/${QUESTIONS_PER_SKILL} questions`,
        );

        return questions;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(
          `⚠️ Skill ${skill.skillId} generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed:`,
        );
        console.warn(lastError.message);

        if (attempt < MAX_GENERATION_ATTEMPTS) {
          console.log(
            `🔄 Retrying skill ${skill.skillId} (${attempt + 1}/${MAX_GENERATION_ATTEMPTS})...`,
          );
        }
      }
    }

    throw new Error(
      `Failed to generate ${QUESTIONS_PER_SKILL} questions for skill ${skill.skillId} (${skill.skillName}) after ${MAX_GENERATION_ATTEMPTS} attempts. Last error: ${
        lastError?.message ?? "Unknown error"
      }`,
    );
  }

  private async generateSkillAttempt(
    skill: SkillGenerationInput,
    attempt: number,
  ): Promise<GeneratedQuestion[]> {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: this.buildSystemPrompt(),
        },
        {
          role: "user",
          content: this.buildSkillPrompt(skill, attempt),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "generated_skill_questions",
          strict: true,
          schema: this.getJsonSchema(),
        },
      },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Groq returned an empty response");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse Groq response as JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    parsed = this.normalizeRightAnswers(parsed);

    const result = GeneratedQuestionsSchema.safeParse(parsed);

    if (!result.success) {
      console.error(
        "❌ Groq returned invalid question data:",
        result.error.flatten(),
      );

      throw new Error(
        "Groq returned question data that does not match the expected schema",
      );
    }

    this.validateSkillQuestions(result.data.questions, skill);

    return result.data.questions;
  }

  private normalizeRightAnswers(parsed: unknown): unknown {
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("questions" in parsed)
    ) {
      return parsed;
    }

    const response = parsed as {
      questions?: unknown;
    };

    if (!Array.isArray(response.questions)) {
      return parsed;
    }

    const normalizedQuestions = response.questions.map((question) => {
      if (
        typeof question !== "object" ||
        question === null ||
        !("options" in question) ||
        !("rightAnswer" in question)
      ) {
        return question;
      }

      const rawQuestion = question as {
        options?: unknown;
        rightAnswer?: unknown;
      };

      if (
        typeof rawQuestion.options !== "object" ||
        rawQuestion.options === null ||
        typeof rawQuestion.rightAnswer !== "string"
      ) {
        return question;
      }

      const options = rawQuestion.options as Record<string, unknown>;
      const rawAnswer = rawQuestion.rightAnswer.trim();
      const normalizedLetter = rawAnswer.toUpperCase();

      if (["A", "B", "C", "D"].includes(normalizedLetter)) {
        return {
          ...rawQuestion,
          rightAnswer: normalizedLetter,
        };
      }

      const normalizedAnswer = rawAnswer.toLowerCase();

      for (const letter of ["A", "B", "C", "D"] as const) {
        const option = options[letter];

        if (typeof option !== "string") {
          continue;
        }

        if (option.trim().toLowerCase() === normalizedAnswer) {
          console.warn(
            `⚠️ Groq returned answer text "${rawAnswer}" instead of "${letter}". Normalizing.`,
          );

          return {
            ...rawQuestion,
            rightAnswer: letter,
          };
        }
      }

      return question;
    });

    return {
      ...parsed,
      questions: normalizedQuestions,
    };
  }

  private buildSystemPrompt(): string {
    return `
You are an expert TOEIC question writer.

Generate NEW and ORIGINAL TOEIC practice questions for an adaptive daily learning test.

Generate EXACTLY ${QUESTIONS_PER_SKILL} questions for the requested skill.

Every question must target the requested skill precisely.

Every question must use an appropriate TOEIC part format.

Every question must have exactly four answer choices:
A, B, C, and D.

Every question must have exactly one correct answer.

rightAnswer MUST ALWAYS contain the LETTER of the correct option.

Valid values are ONLY:
"A"
"B"
"C"
"D"

NEVER put the answer text in rightAnswer.

Every question must include an explanation.

Questions must be grammatically correct.

Questions must sound natural and realistic for TOEIC practice.

Do not copy existing questions.

Do not closely reproduce known TOEIC questions.

Do not create ambiguous questions.

Do not create multiple potentially correct answers.

Do not make the correct answer obvious because it is longer, shorter, more detailed, or differently written than the others.

Avoid questions requiring obscure outside knowledge.

Do not invent facts that are necessary to answer the question.

The requested skillId must be copied exactly.

The partNumber must be one of the valid parts for that skill.

Do not generate questions for any other skill.

Do not stop before reaching exactly ${QUESTIONS_PER_SKILL} questions.

Count the questions before returning the response.

If you have generated fewer than ${QUESTIONS_PER_SKILL} questions, continue generating until you reach ${QUESTIONS_PER_SKILL}.

TOEIC PART REQUIREMENTS:

Part 1:
- Photograph description.
- The question should test understanding of what is happening in a photograph.
- Keep descriptions concrete and visually observable.

Part 2:
- Question-response format.
- One speaker asks a question or makes a statement.
- The learner selects the most appropriate response.

Part 3:
- Conversations between speakers.
- Questions can test main idea, details, inference, or speaker intent.

Part 4:
- Short talks or announcements.
- Questions can test main idea, details, inference, or speaker purpose.

Part 5:
- Incomplete sentence.
- Four choices.
- Primarily grammar and vocabulary.

Part 6:
- Text completion.
- Questions must fit naturally into a short passage.
- Test grammar, vocabulary, sentence structure, or context.

Part 7:
- Reading comprehension.
- Use realistic workplace or everyday reading contexts.
- Questions can test main idea, details, inference, vocabulary in context, or paraphrase.

The requested skill determines what should be tested.

The TOEIC part determines the question format.

Before returning the response, verify:

- Exactly ${QUESTIONS_PER_SKILL} questions exist.
- Every skillId matches the requested skillId.
- Every partNumber is valid.
- Every question has A, B, C, and D.
- Every rightAnswer is exactly "A", "B", "C", or "D".
- rightAnswer is NEVER the answer text.
- Every explanation matches the correct answer.
- Every question is original.

Return ONLY the structured JSON response.
`;
  }

  private buildSkillPrompt(
    skill: SkillGenerationInput,
    attempt: number,
  ): string {
    return `
Generate ${QUESTIONS_PER_SKILL} new TOEIC questions for exactly one target skill.

Generation attempt:
${attempt}

TARGET SKILL
============

skillId:
${skill.skillId}

skillName:
${skill.skillName}

description:
${skill.description ?? "No description provided"}

category:
${skill.category}

parentSkill:
${skill.parentSkillName ?? "None"}

valid TOEIC parts:
${skill.validParts.join(", ")}

REQUIRED COUNT
==============

Exactly ${QUESTIONS_PER_SKILL} questions.

Every generated question MUST:

- use skillId ${skill.skillId}
- use a partNumber from this list: ${skill.validParts.join(", ")}
- target "${skill.skillName}"
- contain the actual question in content
- contain exactly four options: A, B, C, D
- contain exactly one correct answer
- use the option letter for rightAnswer
- use only "A", "B", "C", or "D" for rightAnswer
- contain an explanation
- be a new and original question

Do not generate questions for any other skill.

Do not return fewer than ${QUESTIONS_PER_SKILL} questions.

Do not return more than ${QUESTIONS_PER_SKILL} questions.

Before returning the response, count the questions and confirm that there are exactly ${QUESTIONS_PER_SKILL}.

Return only the structured JSON response.
`;
  }

  private getJsonSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: ["questions"],
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "skillId",
              "partNumber",
              "content",
              "options",
              "rightAnswer",
              "explanation",
            ],
            properties: {
              skillId: {
                type: "integer",
              },
              partNumber: {
                type: "integer",
              },
              content: {
                type: "string",
              },
              options: {
                type: "object",
                additionalProperties: false,
                required: ["A", "B", "C", "D"],
                properties: {
                  A: {
                    type: "string",
                  },
                  B: {
                    type: "string",
                  },
                  C: {
                    type: "string",
                  },
                  D: {
                    type: "string",
                  },
                },
              },
              rightAnswer: {
                type: "string",
                enum: ["A", "B", "C", "D"],
              },
              explanation: {
                type: "string",
              },
            },
          },
        },
      },
    };
  }

  private validateSkillQuestions(
    questions: GeneratedQuestion[],
    skill: SkillGenerationInput,
  ): void {
    if (questions.length !== QUESTIONS_PER_SKILL) {
      throw new Error(
        `Expected ${QUESTIONS_PER_SKILL} generated questions for skill ${skill.skillId}, received ${questions.length}`,
      );
    }

    for (const question of questions) {
      if (question.skillId !== skill.skillId) {
        throw new Error(
          `AI generated question for unexpected skillId ${question.skillId}. Expected ${skill.skillId}`,
        );
      }

      if (!skill.validParts.includes(question.partNumber)) {
        throw new Error(
          `Question for skill ${skill.skillId} uses invalid part ${question.partNumber}. Valid parts: ${skill.validParts.join(", ")}`,
        );
      }
    }
  }

  private validateFinalQuestionSet(
    questions: GeneratedQuestion[],
    skills: SkillGenerationInput[],
  ): void {
    if (questions.length !== TOTAL_QUESTIONS) {
      throw new Error(
        `Expected ${TOTAL_QUESTIONS} generated questions, received ${questions.length}`,
      );
    }

    const expectedSkillIds = new Set(skills.map((skill) => skill.skillId));

    for (const question of questions) {
      if (!expectedSkillIds.has(question.skillId)) {
        throw new Error(
          `AI generated question for unexpected skillId: ${question.skillId}`,
        );
      }
    }

    for (const skill of skills) {
      const skillQuestions = questions.filter(
        (question) => question.skillId === skill.skillId,
      );

      if (skillQuestions.length !== QUESTIONS_PER_SKILL) {
        throw new Error(
          `Expected ${QUESTIONS_PER_SKILL} questions for skill ${skill.skillId} (${skill.skillName}), received ${skillQuestions.length}`,
        );
      }

      for (const question of skillQuestions) {
        if (!skill.validParts.includes(question.partNumber)) {
          throw new Error(
            `Question for skill ${skill.skillId} uses invalid part ${question.partNumber}. Valid parts: ${skill.validParts.join(", ")}`,
          );
        }
      }
    }
  }
}
