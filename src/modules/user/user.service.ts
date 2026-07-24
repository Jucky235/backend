import { Gender } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../config/db";

// Interface cập nhật thông tin user (đồng bộ với Schema)
export interface UpdateUserInfoInput {
  name?: string;
  phoneNumber?: string;
  gender?: Gender;
  password?: string;
}

// Interface tham số phân trang & tìm kiếm
export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Struct SELECT dùng chung để tránh lặp code
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phoneNumber: true,
  gender: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
};

export class UserService {
  // 🟢 1. Lấy danh sách Users (Có phân trang, search & không dùng Prisma namespace)
  async getAllUsers(params?: GetAllUsersParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

    // Tự dựng object where thuần TypeScript, thêm "as const" cho mode "insensitive"
    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          ...safeUserSelect,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.count({ where: whereCondition }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 🟢 2. Lấy thông tin 1 User theo ID
  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        ...safeUserSelect,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });
  }

  // 🟢 3. Cập nhật thông tin User
  async updateUserInfo(id: string, data: UpdateUserInfoInput) {
    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.gender !== undefined) updateData.gender = data.gender;

    if (data.password !== undefined) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(data.password, saltRounds);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });
  }

  // 🟢 4. Xóa User theo ID
  async deleteUser(id: string) {
    // Kiểm tra sự tồn tại của User trước khi xóa
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error("User không tồn tại");
    }

    return await prisma.user.delete({
      where: { id },
      select: safeUserSelect,
    });
  }
}
