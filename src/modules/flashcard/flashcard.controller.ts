import { type Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { FlashcardService } from "./flashcard.service";
import { createDeckSchema } from "./flashcard.schema";

const flashcardService = new FlashcardService();

export class FlashcardController {
  async getAllDeckByUserId(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      const decks = await flashcardService.getDecksByUserId(userId);

      res.status(200).json({
        message: "Successfully fetched decks",
        data: decks,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve decks",
        error: error.message || "Internal server error",
      });
    }
  }

  async createDeck(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      // Validate body with Zod
      const validation = createDeckSchema.safeParse({ body: req.body });

      if (!validation.success) {
        res.status(400).json({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors.body,
        });
        return;
      }

      const newDeck = await flashcardService.createDeck(
        userId,
        validation.data.body,
      );

      res.status(201).json({
        message: "Deck created successfully",
        data: newDeck,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to create deck",
        error: error.message || "Internal server error",
      });
    }
  }
}
