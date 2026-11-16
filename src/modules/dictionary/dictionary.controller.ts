import { Request, Response } from "express";
import { DictionaryService } from "./dictionary.service";

const dictionaryService = new DictionaryService();

export class DictionaryController {
  /** GET /api/dictionary - Get all words. */
  async getAllWords(_req: Request, res: Response) {
    try {
      const words = await dictionaryService.getAllWords();
      return res.status(200).json(words);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Failed to get dictionary words.",
      });
    }
  }

  /** POST /api/dictionary - Insert a word into the dictionary. */
  async createWord(req: Request, res: Response) {
    try {
      const { word, definition } = req.body;

      if (typeof word !== "string" || !word.trim() ||
          typeof definition !== "string" || !definition.trim()) {
        return res.status(400).json({
          message: "Word and definition are required.",
        });
      }

      const result = await dictionaryService.createOrIncrementWord({
        word: word.trim(),
        definition: definition.trim(),
      });

      return res.status(result.existed ? 200 : 201).json(result.word);
    } catch (error: any) {
      return res.status(500).json({
        message: error.message || "Failed to create word.",
      });
    }
  }

  /** PATCH /api/dictionary/:id/search - Record a word search. */
  async incrementSearchCount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "A word ID is required." });
      }

      const word = await dictionaryService.incrementSearchCount(id);
      return res.status(200).json(word);
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Word not found." });
      }
      return res.status(500).json({
        message: error.message || "Failed to update search count.",
      });
    }
  }
}
