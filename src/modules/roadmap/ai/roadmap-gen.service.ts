import Groq from "groq-sdk";
import { z } from "zod";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const TOTAL_QUESTIONS_PER_NODE = 10;
const MAX_GENERATION_ATTEMPTS = 3;

// ==========================================
// --- INDIVIDUAL EXERCISE ZOD SCHEMAS ---
// ==========================================

const FillBlankExerciseSchema = z.object({
  type: z.literal("fill_blank"),
  title: z.string().min(1),
  questions: z
    .array(
      z.object({
        sentence: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});

const WordMatchingExerciseSchema = z.object({
  type: z.literal("word_matching"),
  title: z.string().min(1),
  pairs: z
    .array(
      z.object({
        word: z.string().min(1),
        meaning: z.string().min(1),
      }),
    )
    .min(1),
});

export const ExerciseSchema = z.discriminatedUnion("type", [
  FillBlankExerciseSchema,
  WordMatchingExerciseSchema,
]);

export type Exercise = z.infer<typeof ExerciseSchema>;

// ==========================================
// --- MULTI-ACTIVITY NODE CONTENT SCHEMA ---
// ==========================================

export const NodeContentSchema = z.object({
  exercises: z.array(ExerciseSchema).min(1),
});

export type NodeContent = z.infer<typeof NodeContentSchema>;

export type SkillGenerationInput = {
  skillId: number;
  skillName: string;
  description: string | null;
  category: string;
  parentSkillName: string | null;
};

export class RoadmapQuestionGeneratorService {
  async generateNodeContentForSkills(
    skills: SkillGenerationInput[],
  ): Promise<Map<number, NodeContent>> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    if (skills.length === 0) {
      throw new Error("Expected at least 1 skill to generate node content.");
    }

    console.log(
      `Generating roadmap multi-activity node content across ${skills.length} target skills using Groq model: ${MODEL}`,
    );

    const resultMap = new Map<number, NodeContent>();

    for (let index = 0; index < skills.length; index++) {
      const skill = skills[index];

      console.log(
        `🤖 Generating multi-type node content for skill ${index + 1}/${skills.length}: ${skill.skillName}...`,
      );

      const content = await this.generateSkillNodeContent(skill);
      resultMap.set(skill.skillId, content);

      console.log(`✅ Skill ${skill.skillId} generated successfully.`);
    }

    return resultMap;
  }

  async generateFinalNodeContent(
    skills: SkillGenerationInput[],
  ): Promise<NodeContent> {
    console.log(
      "🤖 Generating comprehensive review node content for final node...",
    );

    const prompt = `
Generate a comprehensive final review with multiple exercise types covering all of the following weak skills:
${skills.map((s) => `- ${s.skillName}`).join("\n")}

Provide exercises across fill_blank_exercises and word_matching_exercises.
Ensure the total number of items across all exercise types equals exactly ${TOTAL_QUESTIONS_PER_NODE}.
Return ONLY valid JSON adhering strictly to the schema.
`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: this.buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "multi_exercise_node_schema",
          strict: true,
          schema: this.getMultiExerciseJsonSchema(),
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Groq returned an empty response for final node");

    const parsed = JSON.parse(raw);
    return this.transformAndValidateNodeContent(parsed);
  }

  private async generateSkillNodeContent(
    skill: SkillGenerationInput,
  ): Promise<NodeContent> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        const content = await this.generateSkillAttempt(skill, attempt);
        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `⚠️ Skill ${skill.skillId} generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed: ${lastError.message}`,
        );
      }
    }

    throw new Error(
      `Failed to generate node content for skill ${skill.skillId} (${skill.skillName}) after ${MAX_GENERATION_ATTEMPTS} attempts. Last error: ${lastError?.message}`,
    );
  }

  private async generateSkillAttempt(
    skill: SkillGenerationInput,
    attempt: number,
  ): Promise<NodeContent> {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: this.buildSystemPrompt() },
        {
          role: "user",
          content: this.buildSkillPrompt(skill, attempt),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "multi_exercise_node_schema",
          strict: true,
          schema: this.getMultiExerciseJsonSchema(),
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
      throw new Error(`Failed to parse Groq response as JSON: ${error}`);
    }

    return this.transformAndValidateNodeContent(parsed);
  }

  private transformAndValidateNodeContent(raw: any): NodeContent {
    const exercises: Exercise[] = [];

    if (raw.fill_blank_exercises && raw.fill_blank_exercises.length > 0) {
      for (const ex of raw.fill_blank_exercises) {
        exercises.push({
          type: "fill_blank",
          title: ex.title,
          questions: ex.questions,
        });
      }
    }

    if (raw.word_matching_exercises && raw.word_matching_exercises.length > 0) {
      for (const ex of raw.word_matching_exercises) {
        exercises.push({
          type: "word_matching",
          title: ex.title,
          pairs: ex.pairs,
        });
      }
    }

    const normalized = { exercises };
    const result = NodeContentSchema.safeParse(normalized);

    if (!result.success) {
      console.error(
        "❌ Schema validation failed for generated node:",
        result.error.flatten(),
      );
      throw new Error(
        "Groq returned exercise content that failed Zod validation",
      );
    }

    return result.data;
  }

  private buildSystemPrompt(): string {
    return `
You are an expert English test creator generating dynamic multi-activity learning nodes for educational roadmaps.

You can populate two exercise pools:
1. fill_blank_exercises: Multiple-choice fill in the blank.
2. word_matching_exercises: Vocabulary matching pairs.

STRICT RULES:
- Include content in both exercise categories per node.
- The TOTAL sum of questions and pairs across all included exercise sections in a node MUST equal exactly ${TOTAL_QUESTIONS_PER_NODE}.
- For fill_blank, ensure the correct "answer" is present inside the "options" array.
- If a section is unused, return an empty array [] for that property.
`;
  }

  private buildSkillPrompt(
    skill: SkillGenerationInput,
    attempt: number,
  ): string {
    return `
Generate multi-activity node exercise JSON for target skill: "${skill.skillName}" (ID: ${skill.skillId}).

Attempt: ${attempt}

SKILL CONTEXT:
Category: ${skill.category}
Description: ${skill.description ?? "None"}
Parent Skill: ${skill.parentSkillName ?? "None"}

INSTRUCTIONS:
- Populate the available exercise type arrays (fill_blank_exercises, word_matching_exercises).
- Ensure that the sum of all items/questions across all exercises in this node equals exactly ${TOTAL_QUESTIONS_PER_NODE} (e.g., 5 fill_blank + 5 word_matching).
`;
  }

  private getMultiExerciseJsonSchema() {
    return {
      type: "object",
      additionalProperties: false,
      required: ["fill_blank_exercises", "word_matching_exercises"],
      properties: {
        fill_blank_exercises: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "questions"],
            properties: {
              title: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["sentence", "options", "answer"],
                  properties: {
                    sentence: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                    },
                    answer: { type: "string" },
                  },
                },
              },
            },
          },
        },
        word_matching_exercises: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "pairs"],
            properties: {
              title: { type: "string" },
              pairs: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["word", "meaning"],
                  properties: {
                    word: { type: "string" },
                    meaning: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
}
