import { prisma } from "../../config/db";
import { DeckVisibility, DeckStatus } from "@prisma/client";
import { ExamCategory } from "@prisma/client";

export interface CreateDeckInput {
  name: string;
  description?: string | null | undefined;
  category: ExamCategory;
  visibility?: DeckVisibility | undefined;
}

export class FlashcardService {
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
}
