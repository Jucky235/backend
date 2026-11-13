import { prisma } from "../../config/db";

export interface CreateWordInput {
  word: string;
  definition: string;
}

export class DictionaryService {
  async createOrIncrementWord(data: CreateWordInput) {
    const existingWord = await prisma.word.findFirst({
      where: { word: data.word },
    });

    if (existingWord) {
      const word = await prisma.word.update({
        where: { id: existingWord.id },
        data: { numberOfTimeSearch: { increment: 1 } },
      });
      return { word, existed: true };
    }

    const word = await prisma.word.create({
      data: { ...data, numberOfTimeSearch: 1 },
    });
    return { word, existed: false };
  }

  async incrementSearchCount(id: string) {
    return prisma.word.update({
      where: { id },
      data: { numberOfTimeSearch: { increment: 1 } },
    });
  }
}
