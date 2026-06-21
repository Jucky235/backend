import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const user = await authService.registerUser(req.body);
      const { password, ...userWithoutPassword } = user;

      return res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      // 🌟 Check if the error message is our duplicate email trigger
      if (error.message === "Email already registered.") {
        return res.status(409).json({ message: error.message }); // 409 Conflict
      }

      // General validation or bad requests
      return res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.loginUser(req.body);
      return res.json(result);
    } catch (error: any) {
      // Standardize your login errors to return a "message" key
      return res.status(400).json({ message: error.message });
    }
  }
}
