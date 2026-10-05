import { Router } from "express";
import { NavigationController } from "./navigation.controller";

const router = Router();
const controller = new NavigationController();

router.post("/search", (req, res) => controller.searchRoute(req, res));

export default router;
