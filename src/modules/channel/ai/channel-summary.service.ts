// src/modules/channel/ai/channel-summary.service.ts
import Groq from "groq-sdk";
import { ChannelService } from "../channel.service";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export class ChannelSummaryService {
  private channelService: ChannelService;
  private groq: Groq;

  constructor() {
    this.channelService = new ChannelService();
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generateSummary(channelId: string, limit = 50) {
    const { channel, formattedPromptContent } =
      await this.channelService.getLatestMessagesForSummary(channelId, limit);

    if (!formattedPromptContent) {
      return {
        channelId,
        channelName: channel.name,
        summary: "Chưa có tin nhắn nào trong kênh để tóm tắt.",
      };
    }

    const chatCompletion = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Bạn là một trợ lý AI chuyên tóm tắt các cuộc trò chuyện nhóm ngắn gọn, chính xác và dễ đọc.",
        },
        {
          role: "user",
          content: `Hãy tóm tắt cuộc trò chuyện gần đây trong kênh "#${channel.name}":

--- CHAT CONTENT ---
${formattedPromptContent}
--- END CHAT CONTENT ---

Hãy trình bày tóm tắt bằng tiếng Việt theo cấu trúc sau:
📌 **Tóm tắt chung**: (2-3 câu ngắn gọn)
💡 **Chủ đề / Quyết định chính**: (các gạch đầu dòng)
✅ **Action Items**: (việc cần làm và người đảm nhận, nếu có)`,
        },
      ],
      model: MODEL, // 👈 Using your configured model here
      temperature: 0.3,
    });

    const summary =
      chatCompletion.choices[0]?.message?.content || "Không thể tạo tóm tắt.";

    return {
      channelId,
      channelName: channel.name,
      summary,
    };
  }
}
