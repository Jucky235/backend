import { Router } from "express";
import { ChannelController } from "./channel.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const controller = new ChannelController();

// Áp dụng middleware authenticateJWT cho tất cả các routes trong channel
router.use(authenticateJWT);

router.get("/", (req, res) => controller.getAllChannels(req, res));
router.get("/:id", (req, res) => controller.getChannelById(req, res));
router.get("/:id/messages", (req, res) =>
  controller.getMessagesByChannelId(req, res),
);
router.get("/:id/summary", (req, res) => controller.summarizeChannel(req, res));

export default router;
