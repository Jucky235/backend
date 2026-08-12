import { prisma } from "../../config/db";
import { ChannelStatus } from "@prisma/client";

export interface GetAllChannelsParams {
  status?: ChannelStatus;
  search?: string;
  includeMessageCount?: boolean;
}

export interface GetChannelMessagesParams {
  channelId: string;
  page?: number;
  limit?: number;
}

// Struct SELECT dùng chung cho Sender details
const safeSenderSelect = {
  id: true,
  name: true,
  email: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

export class ChannelService {
  // 🟢 1. Lấy danh sách tất cả Channels
  async getAllChannels(params?: GetAllChannelsParams) {
    const {
      status = ChannelStatus.ACTIVE,
      search,
      includeMessageCount = false,
    } = params || {};

    const whereCondition: any = { status };

    if (search && search.trim() !== "") {
      whereCondition.name = {
        contains: search.trim(),
        mode: "insensitive" as const,
      };
    }

    return await prisma.chatChannel.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ...(includeMessageCount && {
          _count: {
            select: { messages: true },
          },
        }),
      },
    });
  }

  // 🟢 2. Lấy thông tin chi tiết 1 Channel theo ID
  async getChannelById(id: string) {
    const channel = await prisma.chatChannel.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!channel) {
      throw new Error("Channel không tồn tại");
    }

    return channel;
  }

  // 🟢 3. Lấy tất cả tin nhắn trong 1 Channel theo ID (Có phân trang)
  async getAllMessagesByChannelId(params: GetChannelMessagesParams) {
    const { channelId } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 50, 100)); // Capped at 100 max per request
    const skip = (page - 1) * limit;

    // Kiểm tra sự tồn tại của channel trước
    const channelExists = await prisma.chatChannel.findUnique({
      where: { id: channelId },
    });

    if (!channelExists) {
      throw new Error("Channel không tồn tại");
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { channelId },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" }, // Sắp xếp theo thứ tự thời gian từ cũ đến mới để render chat stream
        select: {
          id: true,
          channelId: true,
          content: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: safeSenderSelect,
          },
        },
      }),
      prisma.chatMessage.count({
        where: { channelId },
      }),
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
