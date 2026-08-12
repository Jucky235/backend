import { type Response } from "express";
import { type AuthenticatedRequest } from "../../middleware/auth";
import { UserService } from "./user.service";

export class UserController {
  private userService = new UserService();

  // 🟢 1. GET /api/users - Lấy danh sách tất cả Users (Dành cho Admin)
  async getAllUsers(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;
      const search = req.query.search
        ? (req.query.search as string)
        : undefined;

      const result = await this.userService.getAllUsers({
        page,
        limit,
        search,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in getAllUsers controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 2. GET /api/users/me - Lấy thông tin cá nhân của User đang đăng nhập
  async getMe(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const user = await this.userService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error: any) {
      console.error("Error in getMe controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 3. PUT /api/users/me - Cập nhật thông tin cá nhân
  async updateMe(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { name, phoneNumber, gender, password } = req.body;

      if (
        name === undefined &&
        phoneNumber === undefined &&
        gender === undefined &&
        password === undefined
      ) {
        return res.status(400).json({ error: "No fields provided for update" });
      }

      const updatedUser = await this.userService.updateUserInfo(req.user.id, {
        name,
        phoneNumber,
        gender,
        password,
      });

      return res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error("Error in updateMe controller:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // 🟢 4. DELETE /api/users/:id - Xóa user theo ID
  async deleteUser(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const deletedUser = await this.userService.deleteUser(id);

      return res.status(200).json({
        message: "Xóa user thành công",
        data: deletedUser,
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Xóa user thất bại",
      });
    }
  }

  // 🟢 5. POST /api/users/messages - Gửi tin nhắn vào channel từ User đang đăng nhập
  async sendMessage(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<Response> {
    try {
      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      const { channelId, content, attachments } = req.body;

      // Validate required inputs
      if (!channelId || typeof channelId !== "string") {
        return res.status(400).json({ error: "channelId là bắt buộc" });
      }

      if (!content || typeof content !== "string" || content.trim() === "") {
        return res
          .status(400)
          .json({ error: "Nội dung tin nhắn không được để trống" });
      }

      const newMessage = await this.userService.sendMessage(
        senderId,
        channelId,
        content,
        attachments || [],
      );

      return res.status(201).json({
        message: "Gửi tin nhắn thành công",
        data: newMessage,
      });
    } catch (error: any) {
      console.error("Error in sendMessage controller:", error);
      return res.status(400).json({
        error: error.message || "Gửi tin nhắn thất bại",
      });
    }
  }
}
