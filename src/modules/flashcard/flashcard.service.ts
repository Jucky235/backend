import { prisma } from "../../config/db";
import {
  DeckVisibility,
  DeckStatus,
  ExamCategory,
  BoxLevel,
} from "@prisma/client";
import { FSRSEngine, FSRSRating } from "./fsrs.engine";

export interface CreateDeckInput {
  name: string;
  description?: string | null;
  category: ExamCategory;
  visibility?: DeckVisibility;
}

export interface CreateFlashcardInput {
  frontContent: string;
  backContent: string;
  explanation?: string | null;
  imagePath?: string | null;
  audioPath?: string | null;
  partNumber?: number | null;
}

export class FlashcardService {
  // --- Existing CRUD Methods ---

  async getDecksByUserId(userId: string) {
    return await prisma.deck.findMany({
      where: {
        status: DeckStatus.ACTIVE,
        OR: [{ visibility: DeckVisibility.PUBLIC }, { creatorId: userId }],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createDeck(userId: string, data: CreateDeckInput) {
    return await prisma.deck.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        visibility: data.visibility ?? DeckVisibility.PRIVATE,
        status: DeckStatus.ACTIVE,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });
  }

  async createFlashcardToDeck(
    deckId: string,
    userId: string,
    data: CreateFlashcardInput,
  ) {
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        creatorId: userId,
        status: DeckStatus.ACTIVE,
      },
    });

    if (!deck) {
      throw new Error(
        "Deck not found or you do not have permission to add cards to this deck.",
      );
    }

    return await prisma.flashcard.create({
      data: {
        deckId: deck.id,
        creatorId: userId,
        frontContent: data.frontContent,
        backContent: data.backContent,
        explanation: data.explanation ?? null,
        imagePath: data.imagePath ?? null,
        audioPath: data.audioPath ?? null,
        partNumber: data.partNumber ?? null,
        status: DeckStatus.ACTIVE,
      },
    });
  }

  async getDeckById(deckId: string, userId: string) {
    return await prisma.deck.findFirst({
      where: {
        id: deckId,
        status: DeckStatus.ACTIVE,
        OR: [{ visibility: DeckVisibility.PUBLIC }, { creatorId: userId }],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cards: true,
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });
  }

  // --- Spaced Repetition (FSRS) & Study Methods ---

  /**
   * Retrieves flashcards due for review or unreviewed, along with deck progress stats.
   */
  async getDueCards(userId: string, deckId: string, limit: number = 20) {
    const now = new Date();

    const [cards, stats] = await Promise.all([
      // Fetch due or unreviewed cards
      prisma.flashcard.findMany({
        where: {
          deckId,
          status: DeckStatus.ACTIVE,
          OR: [
            {
              userProgresses: {
                none: { userId },
              },
            },
            {
              userProgresses: {
                some: {
                  userId,
                  nextReviewAt: { lte: now },
                },
              },
            },
          ],
        },
        include: {
          userProgresses: {
            where: { userId },
          },
        },
        take: limit,
      }),

      // Reuses the single source of truth for deck study stats
      this.getDeckStudyStats(userId, deckId),
    ]);

    return {
      cards,
      counts: {
        newCount: stats.newCount,
        learningCount: stats.learningCount,
        dueCount: stats.dueCount,
      },
    };
  }

  /**
   * Processes a flashcard review rating using FSRS calculations.
   */
  async reviewCard(userId: string, flashcardId: string, rating: FSRSRating) {
    const now = new Date();

    const flashcard = await prisma.flashcard.findUnique({
      where: { id: flashcardId },
      include: {
        userProgresses: {
          where: { userId },
        },
      },
    });

    if (!flashcard) {
      throw new Error("Flashcard not found.");
    }

    const currentProgress = flashcard.userProgresses[0];

    const currentState = {
      stability: currentProgress?.intervalDays ?? 1,
      difficulty: currentProgress?.easeFactor ?? 2.5,
      repetitions: currentProgress?.repetitions ?? 0,
    };

    const fsrsOutput = FSRSEngine.calculateNextState(currentState, rating, now);

    // Persist or update progress record
    const updatedProgress = await prisma.flashcardProgress.upsert({
      where: {
        userId_flashcardId: { userId, flashcardId },
      },
      create: {
        userId,
        flashcardId,
        box: fsrsOutput.box,
        intervalDays: fsrsOutput.intervalDays,
        easeFactor: fsrsOutput.easeFactor,
        repetitions: fsrsOutput.repetitions,
        nextReviewAt: fsrsOutput.nextReviewAt,
        lastReviewedAt: now,
      },
      update: {
        box: fsrsOutput.box,
        intervalDays: fsrsOutput.intervalDays,
        easeFactor: fsrsOutput.easeFactor,
        repetitions: fsrsOutput.repetitions,
        nextReviewAt: fsrsOutput.nextReviewAt,
        lastReviewedAt: now,
      },
    });

    // Update aggregated Deck progress for user dashboard
    await this.syncUserDeckProgress(userId, flashcard.deckId);

    return updatedProgress;
  }

  /**
   * Updates overall deck mastery statistics for a given user.
   */
  private async syncUserDeckProgress(userId: string, deckId: string) {
    const [viewedCards, masteredCards] = await Promise.all([
      prisma.flashcardProgress.count({
        where: {
          userId,
          flashcard: { deckId, status: DeckStatus.ACTIVE },
        },
      }),
      prisma.flashcardProgress.count({
        where: {
          userId,
          flashcard: { deckId, status: DeckStatus.ACTIVE },
          box: { in: [BoxLevel.BOX_6, BoxLevel.BOX_7] },
        },
      }),
    ]);

    await prisma.userDeckProgress.upsert({
      where: {
        userId_deckId: { userId, deckId },
      },
      create: {
        userId,
        deckId,
        totalCardsViewed: viewedCards,
        masteredCards,
        lastStudiedAt: new Date(),
      },
      update: {
        totalCardsViewed: viewedCards,
        masteredCards,
        lastStudiedAt: new Date(),
      },
    });
  }

  /**
   * Calculates comprehensive deck statistics for study screens.
   */
  async getDeckStudyStats(userId: string, deckId: string) {
    const now = new Date();

    const [totalCards, newCount, learningCount, dueCount] = await Promise.all([
      // 1. Total active cards in deck
      prisma.flashcard.count({
        where: { deckId, status: DeckStatus.ACTIVE },
      }),

      // 2. New cards (never reviewed by user)
      prisma.flashcard.count({
        where: {
          deckId,
          status: DeckStatus.ACTIVE,
          userProgresses: {
            none: { userId },
          },
        },
      }),

      // 3. Learning cards (in initial boxes, e.g., BOX_1 to BOX_3, not due yet)
      prisma.flashcardProgress.count({
        where: {
          userId,
          flashcard: { deckId, status: DeckStatus.ACTIVE },
          box: { in: [BoxLevel.BOX_1, BoxLevel.BOX_2, BoxLevel.BOX_3] },
        },
      }),

      // 4. Due cards (reviewed cards scheduled for review now or earlier)
      prisma.flashcardProgress.count({
        where: {
          userId,
          flashcard: { deckId, status: DeckStatus.ACTIVE },
          nextReviewAt: { lte: now },
        },
      }),
    ]);

    return {
      totalCards,
      newCount,
      learningCount,
      dueCount,
    };
  }
}
