import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const controller = new AuthController();

// Bọc trong arrow function để không bị mất ngữ cảnh 'this' (tránh lỗi undefined authService)
router.post("/signup", (req, res) => controller.register(req, res));
router.post("/login", (req, res) => controller.login(req, res));

export default router;
