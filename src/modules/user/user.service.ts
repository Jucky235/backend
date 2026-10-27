import { Gender } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../../config/db";

export interface UpdateUserInfoInput {
  name?: string;
  phoneNumber?: string;
  gender?: Gender;
  password?: string;
  avatar?: string;
}

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phoneNumber: true,
  gender: true,
  avatarUrl: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
};

export class UserService {
  async getAllUsers(params?: GetAllUsersParams) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, params?.limit || 10);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

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

  async getUserById(id: string) {
    const userInfo = await prisma.user.findUnique({
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

    const Examhistory = await prisma.examHistory.findMany({
      where: { userId: id },
    });
    return {
      userInfo,
      Examhistory,
    };
  }

  async updateUserInfo(id: string, data: UpdateUserInfoInput) {
    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.gender !== undefined) updateData.gender = data.gender;

    // 🟢 Map the incoming avatar string to Prisma's avatarUrl column
    if (data.avatar !== undefined) updateData.avatarUrl = data.avatar;

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

  async deleteUser(id: string) {
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

  async sendMessage(
    senderId: string,
    channelId: string,
    content: string,
    attachments: string[] = [],
  ) {
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error("Channel không tồn tại");
    }

    return await prisma.chatMessage.create({
      data: {
        senderId,
        channelId,
        content,
        attachments,
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
