import { Router } from "express";
import { ChannelController } from "./channel.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const controller = new ChannelController();

// Tất cả routes channel yêu cầu người dùng phải đăng nhập
router.get("/", authenticateJWT, (req, res) =>
  controller.getAllChannels(req, res),
);
router.get("/:id", authenticateJWT, (req, res) =>
  controller.getChannelById(req, res),
);
router.get("/:id/messages", authenticateJWT, (req, res) =>
  controller.getMessagesByChannelId(req, res),
);

export default router;
