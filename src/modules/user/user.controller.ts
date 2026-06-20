import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { prisma } from "../../config/db";

export class UserController {
  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
