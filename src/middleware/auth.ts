import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Payload lưu trong JWT nên chứa thêm roleName
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
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  // ============================================================
  // DEBUG: Print JWT token
  // Only enable this in development.
  // ============================================================

  if (process.env.NODE_ENV !== "production") {
    console.log("🔐 JWT Token:");
    console.log(token);
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error(
      "❌ CRITICAL ERROR: JWT_SECRET is not defined in environment variables.",
    );

    return res.status(500).json({
      error: "Internal server configuration error.",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Gán thông tin decoded vào req.user
    req.user = decoded;

    if (process.env.NODE_ENV !== "production") {
      console.log("👤 Authenticated user:");
      console.log({
        id: decoded.id,
        email: decoded.email,
        roleName: decoded.roleName,
      });
    }

    return next();
  } catch (error: any) {
    console.error("❌ JWT verification failed:", error.message);

    return res.status(401).json({
      error: "Invalid or expired token.",
    });
  }
};
