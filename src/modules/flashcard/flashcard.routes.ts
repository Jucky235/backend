import { Router } from "express";
import { FlashcardController } from "./flashcard.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const flashcardController = new FlashcardController();

// GET /decks -> fetches user's decks
router.get("/decks", authenticateJWT, (req, res) =>
  flashcardController.getAllDeckByUserId(req, res),
);

// POST /decks -> creates a deck
router.post("/decks", authenticateJWT, (req, res) =>
  flashcardController.createDeck(req, res),
);

// POST /decks/:deckId/cards -> creates a new flashcard in a deck
router.post("/decks/:deckId/cards", authenticateJWT, (req, res) =>
  flashcardController.createCardToDeck(req, res),
);

// GET /decks/:deckId -> fetches single deck by ID
router.get("/decks/:deckId", authenticateJWT, (req, res) =>
  flashcardController.getDeckById(req, res),
);

// GET /decks/:deckId/stats -> fetches study statistics for a specific deck
router.get("/decks/:deckId/stats", authenticateJWT, (req, res) =>
  flashcardController.getDeckStudyStats(req, res),
);

// GET /decks/:deckId/due -> fetches cards due for study/review in a deck
router.get("/decks/:deckId/due", authenticateJWT, (req, res) =>
  flashcardController.getDueCards(req, res),
);

// POST /cards/:cardId/review -> submits FSRS review rating for a flashcard
router.post("/cards/:cardId/review", authenticateJWT, (req, res) =>
  flashcardController.reviewCard(req, res),
);

export default router;
