import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { DictionaryController } from "./dictionary.controller";

const router = Router();
const dictionaryController = new DictionaryController();

router.post("/", authenticateJWT, (req, res) =>
  dictionaryController.createWord(req, res),
);

router.patch("/:id/search", authenticateJWT, (req, res) =>
  dictionaryController.incrementSearchCount(req, res),
);

export default router;
