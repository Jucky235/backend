import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticateJWT } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/role";

const router = Router();
const controller = new UserController();

// Profile của chính user đang đăng nhập
router.get("/me", authenticateJWT, (req, res) => controller.getMe(req, res));
router.put("/me", authenticateJWT, (req, res) => controller.updateMe(req, res));

// 💬 Gửi tin nhắn vào channel (Mọi user đã đăng nhập đều có thể gửi)
router.post("/messages", authenticateJWT, (req, res) =>
  controller.sendMessage(req, res),
);

// 🔒 Chỉ ADMIN mới có quyền xem tất cả users
router.get("/", authenticateJWT, requireAdmin, (req, res) =>
  controller.getAllUsers(req, res),
);

// 🔒 Chỉ ADMIN mới có quyền xóa user
router.delete("/:id", authenticateJWT, requireAdmin, (req, res) =>
  controller.deleteUser(req, res),
);

export default router;
