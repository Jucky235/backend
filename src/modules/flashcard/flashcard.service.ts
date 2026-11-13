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

export type ImportedFlashcardRow = {
  frontContent?: string;
  backContent?: string;
  front?: string;
  back?: string;
  question?: string;
  answer?: string;
  explanation?: string | null;
  imagePath?: string | null;
  audioPath?: string | null;
  partNumber?: number | null;
};

export type ParsedDeckImport = {
  deckName?: string;
  description?: string | null;
  cards: ImportedFlashcardRow[];
};

export class FlashcardService {
  private parseCsvRows(input: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (char === '"') {
        if (inQuotes && input[i + 1] === '"') {
          currentValue += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && input[i + 1] === "\n") {
          i += 1;
        }

        currentRow.push(currentValue);
        if (currentRow.some((cell) => cell.trim() !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentValue = "";
        continue;
      }

      currentValue += char;
    }

    currentRow.push(currentValue);
    if (currentRow.some((cell) => cell.trim() !== "")) {
      rows.push(currentRow);
    }

    return rows.map((row) => row.map((cell) => cell.trim()));
  }

  parseImportCSV(csvText: string): ImportedFlashcardRow[] {
    const normalized = csvText.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return [];
    }

    const rows = this.parseCsvRows(normalized);
    if (rows.length === 0) {
      return [];
    }

    const [headerRow, ...dataRows] = rows;
    const lowerHeader = headerRow.map((cell) => cell.toLowerCase().trim());

    const hasDeckMetadataColumns =
      lowerHeader.some((cell) => cell === "deck name") ||
      lowerHeader.some((cell) => cell === "deck description");

    if (hasDeckMetadataColumns) {
      const deckNameIndex = lowerHeader.findIndex((cell) => cell === "deck name");
      const descriptionIndex = lowerHeader.findIndex(
        (cell) => cell === "deck description",
      );
      const frontIndex = lowerHeader.findIndex((cell) =>
        ["front content", "front", "question", "term", "prompt"].includes(cell),
      );
      const backIndex = lowerHeader.findIndex((cell) =>
        ["back content", "back", "answer", "definition", "response"].includes(cell),
      );
      const explanationIndex = lowerHeader.findIndex((cell) => cell === "explanation");

      const validRows = dataRows.filter((row) => {
        const deckName = deckNameIndex >= 0 ? row[deckNameIndex]?.trim() : "";
        const front = frontIndex >= 0 ? row[frontIndex]?.trim() : "";
        const back = backIndex >= 0 ? row[backIndex]?.trim() : "";
        return deckName || front || back;
      });

      return validRows
        .map((row) => {
          const frontContent = (frontIndex >= 0 ? row[frontIndex] : "")?.trim() ?? "";
          const backContent = (backIndex >= 0 ? row[backIndex] : "")?.trim() ?? "";
          const explanation =
            explanationIndex >= 0 ? row[explanationIndex]?.trim() ?? null : null;

          return {
            frontContent,
            backContent,
            explanation,
          };
        })
        .filter((row) => row.frontContent && row.backContent);
    }

    const frontIndex = lowerHeader.findIndex((cell) =>
      ["front", "frontcontent", "question", "term", "prompt", "front content"].includes(cell),
    );
    const backIndex = lowerHeader.findIndex((cell) =>
      ["back", "backcontent", "answer", "definition", "response", "back content"].includes(cell),
    );

    if (frontIndex === -1 || backIndex === -1) {
      if (rows.length === 1) {
        return [];
      }

      return dataRows
        .filter((row) => row.length >= 2)
        .map((row) => ({
          frontContent: row[0],
          backContent: row[1],
        }));
    }

    return dataRows
      .filter((row) => row.length > Math.max(frontIndex, backIndex))
      .map((row) => {
        const explanationIndex = lowerHeader.findIndex((cell) => cell === "explanation");
        const explanation =
          explanationIndex >= 0 ? row[explanationIndex] ?? null : null;

        return {
          frontContent: row[frontIndex] ?? "",
          backContent: row[backIndex] ?? "",
          explanation,
        };
      })
      .filter((row) => row.frontContent && row.backContent);
  }

  parseDeckImportCSV(csvText: string): ParsedDeckImport {
    const normalized = csvText.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return { cards: [] };
    }

    const rows = this.parseCsvRows(normalized);
    if (rows.length === 0) {
      return { cards: [] };
    }

    const [headerRow, ...dataRows] = rows;
    const lowerHeader = headerRow.map((cell) => cell.toLowerCase().trim());
    const deckNameIndex = lowerHeader.findIndex((cell) => cell === "deck name");
    const descriptionIndex = lowerHeader.findIndex(
      (cell) => cell === "deck description",
    );
    const frontIndex = lowerHeader.findIndex((cell) =>
      ["front content", "front", "question", "term", "prompt"].includes(cell),
    );
    const backIndex = lowerHeader.findIndex((cell) =>
      ["back content", "back", "answer", "definition", "response"].includes(cell),
    );
    const explanationIndex = lowerHeader.findIndex((cell) => cell === "explanation");

    const deckName =
      deckNameIndex >= 0 && dataRows[0] ? dataRows[0][deckNameIndex]?.trim() || undefined : undefined;
    const description =
      descriptionIndex >= 0 && dataRows[0]
        ? dataRows[0][descriptionIndex]?.trim() || null
        : null;

    const cards = dataRows
      .filter((row) => row.length > 0)
      .map((row) => {
        const frontContent = (frontIndex >= 0 ? row[frontIndex] : "")?.trim() ?? "";
        const backContent = (backIndex >= 0 ? row[backIndex] : "")?.trim() ?? "";
        const explanation =
          explanationIndex >= 0 ? row[explanationIndex]?.trim() ?? null : null;

        return {
          frontContent,
          backContent,
          explanation,
        };
      })
      .filter((row) => row.frontContent && row.backContent);

    return {
      deckName,
      description,
      cards,
    };
  }

  async createManyCardsToDeck(
    deckId: string,
    userId: string,
    cards: ImportedFlashcardRow[],
  ) {
    if (!Array.isArray(cards) || cards.length === 0) {
      throw new Error("No cards provided for deck import.");
    }

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

    const payload = cards.map((card, index) => {
      const frontContent =
        (card.frontContent ?? card.front ?? card.question ?? "").trim();
      const backContent =
        (card.backContent ?? card.back ?? card.answer ?? "").trim();

      if (!frontContent || !backContent) {
        throw new Error(
          `Invalid imported card at row ${index + 1}: front and back content are required.`,
        );
      }

      return {
        deckId: deck.id,
        creatorId: userId,
        frontContent,
        backContent,
        explanation: card.explanation ?? null,
        imagePath: card.imagePath ?? null,
        audioPath: card.audioPath ?? null,
        partNumber: card.partNumber ?? null,
        status: DeckStatus.ACTIVE,
      };
    });

    return await Promise.all(
      payload.map((data) => prisma.flashcard.create({ data })),
    );
  }

  async createDeckWithCards(
    userId: string,
    data: CreateDeckInput,
    cards: ImportedFlashcardRow[] = [],
  ) {
    return prisma.$transaction(async (tx) => {
      const deck = await tx.deck.create({
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

      if (!Array.isArray(cards) || cards.length === 0) {
        return { deck, cards: [] };
      }

      const payload = cards.map((card, index) => {
        const frontContent =
          (card.frontContent ?? card.front ?? card.question ?? "").trim();
        const backContent =
          (card.backContent ?? card.back ?? card.answer ?? "").trim();

        if (!frontContent || !backContent) {
          throw new Error(
            `Invalid imported card at row ${index + 1}: front and back content are required.`,
          );
        }

        return {
          deckId: deck.id,
          creatorId: userId,
          frontContent,
          backContent,
          explanation: card.explanation ?? null,
          imagePath: card.imagePath ?? null,
          audioPath: card.audioPath ?? null,
          partNumber: card.partNumber ?? null,
          status: DeckStatus.ACTIVE,
        };
      });

      const createdCards = await Promise.all(
        payload.map((cardData) => tx.flashcard.create({ data: cardData })),
      );

      return {
        deck,
        cards: createdCards,
      };
    });
  }

  // --- Existing CRUD Methods ---
  async getAllPublicDeck() {
    return await prisma.deck.findMany({
      where: {
        visibility: DeckVisibility.PUBLIC,
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
