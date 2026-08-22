import { type Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { FlashcardService } from "./flashcard.service";
import {
  createDeckSchema,
  createCardSchema,
  getDueCardsSchema,
  reviewCardSchema,
} from "./flashcard.schema";

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

  async createCardToDeck(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { deckId } = req.params;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      if (!deckId) {
        res.status(400).json({
          message: "Deck ID parameter is required.",
        });
        return;
      }

      const validation = createCardSchema.safeParse({
        body: req.body,
        params: req.params,
      });

      if (!validation.success) {
        const fieldErrors = validation.error.flatten().fieldErrors;
        res.status(400).json({
          message: "Validation failed",
          errors: fieldErrors.body || fieldErrors.params,
        });
        return;
      }

      const newCard = await flashcardService.createFlashcardToDeck(
        deckId,
        userId,
        validation.data.body,
      );

      res.status(201).json({
        message: "Flashcard created successfully",
        data: newCard,
      });
    } catch (error: any) {
      if (error.message?.includes("Deck not found")) {
        res.status(404).json({
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        message: "Failed to create flashcard",
        error: error.message || "Internal server error",
      });
    }
  }

  async getDeckById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { deckId } = req.params;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      if (!deckId) {
        res.status(400).json({
          message: "Deck ID parameter is required.",
        });
        return;
      }

      const deck = await flashcardService.getDeckById(deckId, userId);

      if (!deck) {
        res.status(404).json({
          message: "Deck not found.",
        });
        return;
      }

      res.status(200).json({
        message: "Successfully fetched deck",
        data: deck,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve deck",
        error: error.message || "Internal server error",
      });
    }
  }

  // --- Spaced Repetition (FSRS) & Study Handlers ---

  async getDueCards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      const validation = getDueCardsSchema.safeParse({
        params: req.params,
        query: req.query,
      });

      if (!validation.success) {
        const fieldErrors = validation.error.flatten().fieldErrors;
        res.status(400).json({
          message: "Validation failed",
          errors: fieldErrors.params || fieldErrors.query,
        });
        return;
      }

      const { deckId } = validation.data.params;
      const { limit } = validation.data.query;

      const dueCardsData = await flashcardService.getDueCards(
        userId,
        deckId,
        limit,
      );

      res.status(200).json({
        message: "Successfully fetched due cards and stats",
        data: dueCardsData,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve due cards",
        error: error.message || "Internal server error",
      });
    }
  }

  async getDeckStudyStats(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { deckId } = req.params;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      if (!deckId) {
        res.status(400).json({
          message: "Deck ID parameter is required.",
        });
        return;
      }

      const stats = await flashcardService.getDeckStudyStats(userId, deckId);

      res.status(200).json({
        message: "Successfully fetched deck study stats",
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to retrieve deck study stats",
        error: error.message || "Internal server error",
      });
    }
  }

  async reviewCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          message: "Unauthorized: User identification missing.",
        });
        return;
      }

      const validation = reviewCardSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!validation.success) {
        const fieldErrors = validation.error.flatten().fieldErrors;
        res.status(400).json({
          message: "Validation failed",
          errors: fieldErrors.params || fieldErrors.body,
        });
        return;
      }

      const { cardId } = validation.data.params;
      const { rating } = validation.data.body;

      const updatedProgress = await flashcardService.reviewCard(
        userId,
        cardId,
        rating,
      );

      res.status(200).json({
        message: "Card review recorded successfully",
        data: updatedProgress,
      });
    } catch (error: any) {
      if (error.message?.includes("Flashcard not found")) {
        res.status(404).json({
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        message: "Failed to record review",
        error: error.message || "Internal server error",
      });
    }
  }
}
