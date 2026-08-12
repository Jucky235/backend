import { type Response } from "express";
import { type AuthenticatedRequest } from "../../middleware/auth";
import { ChannelService } from "./channel.service";
import { ChannelStatus } from "@prisma/client";

export class ChannelController {
  private channelService = new ChannelService();

  // 🟢 1. GET /api/channels - Lấy danh sách tất cả Channels
  async getAllChannels(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const status = req.query.status as ChannelStatus | undefined;
      const search = req.query.search
        ? (req.query.search as string)
        : undefined;
      const includeMessageCount = req.query.includeMessageCount === "true";

      const channels = await this.channelService.getAllChannels({
        status,
        search,
        includeMessageCount,
      });

      return res.status(200).json({
        data: channels,
      });
    } catch (error: any) {
      console.error("Error in getAllChannels controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 2. GET /api/channels/:id - Lấy thông tin chi tiết 1 Channel theo ID
  async getChannelById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Channel ID là bắt buộc" });
      }

      const channel = await this.channelService.getChannelById(id);

      return res.status(200).json({
        data: channel,
      });
    } catch (error: any) {
      console.error("Error in getChannelById controller:", error);
      return res.status(400).json({
        error: error.message || "Không thể lấy thông tin channel",
      });
    }
  }

  // 🟢 3. GET /api/channels/:id/messages - Lấy danh sách tin nhắn theo Channel ID
  async getMessagesByChannelId(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { id: channelId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;

      if (!channelId) {
        return res.status(400).json({ error: "Channel ID là bắt buộc" });
      }

      const result = await this.channelService.getAllMessagesByChannelId({
        channelId,
        page,
        limit,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getMessagesByChannelId controller:", error);
      return res.status(400).json({
        error: error.message || "Không thể lấy danh sách tin nhắn",
      });
    }
  }
}
