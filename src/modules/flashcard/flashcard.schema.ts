import { z } from "zod";
import { ExamCategory, DeckVisibility } from "@prisma/client";

export const createDeckSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Deck name is required",
      })
      .min(1, "Deck name cannot be empty"),
    description: z.string().optional(),
    category: z.nativeEnum(ExamCategory, {
      errorMap: () => ({ message: "Invalid exam category" }),
    }),
    visibility: z
      .nativeEnum(DeckVisibility)
      .optional()
      .default(DeckVisibility.PRIVATE),
  }),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;
