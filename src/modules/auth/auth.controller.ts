import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService = new AuthService();

  async register(req: Request, res: Response) {
    try {
      const user = await this.authService.registerUser(req.body);
      const { password, refreshTokens, ...userWithoutPassword } = user;

      return res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      if (error.message === "Email already registered.") {
        return res.status(409).json({ message: error.message });
      }

      return res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await this.authService.loginUser(req.body);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
