import { AuthProvider } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db";

export class AuthService {
  async registerUser(data: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new Error("Email already registered.");

    // 1. Tìm Role mặc định là "USER" cho tài khoản mới đăng ký
    const defaultRole = await prisma.role.findFirst({
      where: { name: "USER" },
    });

    if (!defaultRole) {
      throw new Error("Default USER role not found in system.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 2. Tạo User với roleId gán vào Role "USER"
    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        provider: AuthProvider.EMAIL,
        roleId: defaultRole.id, // 👈 Gán role mặc định ở đây
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async loginUser(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.password) throw new Error("Invalid credentials.");

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new Error("Invalid credentials.");

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not configured.");

    // 3. Đưa `roleId` vào JWT Token Payload để Middleware Auth đọc được
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleId: user.roleId, // 👈 Đưa roleId vào token
      },
      jwtSecret,
      { expiresIn: "1d" },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // 👈 Trả về cả thông tin Role cho Client
      },
    };
  }
}
