import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Payload lưu trong JWT nên chứa thêm roleId
export interface JwtPayload {
  id: string;
  email: string;
  roleName: string;
}

// Mở rộng Request của Express
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error(
      "❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.",
    );
    return res
      .status(500)
      .json({ error: "Internal server configuration error." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Gán thông tin decoded (bao gồm id, email, roleId) vào req.user
    req.user = decoded;

    return next();
  } catch (error: any) {
    // Trả về 401 Unauthorized nếu token hết hạn hoặc invalid
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};
