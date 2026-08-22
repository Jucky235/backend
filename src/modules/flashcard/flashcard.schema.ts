import { z } from "zod";
import { FSRSRating } from "./fsrs.engine";

// Existing schemas remain unchanged...
export const createDeckSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    category: z.string().min(1, "Category is required"),
    visibility: z.string().optional(),
  }),
});

export const createCardSchema = z.object({
  params: z.object({
    deckId: z.string().uuid("Invalid deck ID format"),
  }),
  body: z.object({
    frontContent: z.string().min(1, "Front content is required"),
    backContent: z.string().min(1, "Back content is required"),
    explanation: z.string().optional().nullable(),
    imagePath: z.string().optional().nullable(),
    audioPath: z.string().optional().nullable(),
    partNumber: z.number().optional().nullable(),
  }),
});

// New schemas for FSRS review endpoints
export const getDueCardsSchema = z.object({
  params: z.object({
    deckId: z.string().uuid("Invalid deck ID format"),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
});

export const reviewCardSchema = z.object({
  params: z.object({
    cardId: z.string().uuid("Invalid card ID format"),
  }),
  body: z.object({
    rating: z.nativeEnum(FSRSRating, {
      errorMap: () => ({
        message: "Rating must be 1 (AGAIN), 2 (HARD), 3 (GOOD), or 4 (EASY)",
      }),
    }),
  }),
});
