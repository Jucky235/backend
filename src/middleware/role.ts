import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth"; // import your custom type

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  console.log(user);
  // Now user.role directly holds "ADMIN"
  if (user.roleName != "ADMIN") {
    return res
      .status(403)
      .json({ message: "Forbidden: Admin access required" });
  }

  next();
};
