import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const controller = new AuthController();

router.post("/signup", controller.register);
router.post("/login", controller.login);

export default router;
