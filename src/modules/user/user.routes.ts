import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const controller = new UserController();

// Protect this profile route using our auth middleware
router.get("/me", authenticateJWT, controller.getMe as any);

export default router;
