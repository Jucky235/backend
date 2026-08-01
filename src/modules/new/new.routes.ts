import { Router } from "express";
import { NewController } from "./new.controller";
import { authenticateJWT } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/role";

const router = Router();
const controller = new NewController();

router.get("/", authenticateJWT, (req, res) => controller.getAllNews(req, res));
router.get("/:id", authenticateJWT, (req, res) =>
  controller.getNewsById(req, res),
);

export default router;
