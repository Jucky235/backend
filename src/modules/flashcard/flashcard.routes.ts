import { Router } from "express";
import { FlashcardController } from "./flashcard.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const flashcardController = new FlashcardController();

// GET /decks -> fetches user's decks (requires auth middleware to populate req.user)
router.get("/decks", authenticateJWT, (req, res) =>
  flashcardController.getAllDeckByUserId(req, res),
);

// POST /decks -> creates a deck (matches RTK Query's url: "/decks")
router.post("/decks", authenticateJWT, (req, res) =>
  flashcardController.createDeck(req, res),
);

export default router;
