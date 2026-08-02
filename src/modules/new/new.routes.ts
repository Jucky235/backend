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
router.post("/", authenticateJWT, requireAdmin, (req, res) =>
  controller.createNew(req, res),
);
router.delete("/:id", authenticateJWT, requireAdmin, controller.deleteNews);
router.put("/:id", authenticateJWT, requireAdmin, controller.updateNews);

export default router;
