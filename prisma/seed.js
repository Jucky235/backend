import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Cấu hình URL Cloudinary của bạn
const CLOUDINARY_IMAGE_BASE =
  "https://res.cloudinary.com/mxxbk0jh/image/upload/f_auto,q_auto/toeic_images";
const CLOUDINARY_AUDIO_BASE =
  "https://res.cloudinary.com/mxxbk0jh/video/upload/english_audios";

// Khai báo đường dẫn trỏ thẳng sang thư mục toeicPipeline nằm song song ở ngoài
const PIPELINE_DIR = path.resolve("../toeicPipeline");

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu TOEIC tổng lực từ pipeline vào Neon...");

  // 1. Tạo một đề thi tổng thể chứa toàn bộ câu hỏi này
  const exam = await prisma.exam.create({
    data: {
      name: "Đề thi thử TOEIC Tổng Hợp Full Parts",
      category: "TOEIC",
      time: 120, // 120 phút
      status: "ACTIVE",
    },
  });

  // 2. Danh sách tất cả các file JSON xuất hiện trong thư mục toeicPipeline của bạn
  const targetFiles = [
    { name: "toeic_part_1_from_1_output.json", part: 1 },
    { name: "toeic_part_2_from_7_output.json", part: 2 },
    { name: "toeic_part_2_from_19_output.json", part: 2 },
    { name: "toeic_part_3_from_32_output.json", part: 3 },
    { name: "toeic_part_3_from_47_output.json", part: 3 },
    { name: "toeic_part_3_from_62_output.json", part: 3 },
    { name: "toeic_part_4_from_71_output.json", part: 4 },
    { name: "toeic_part_4_from_86_output.json", part: 4 },
    { name: "toeic_part_5_from_101_output.json", part: 5 },
    { name: "toeic_part_5_from_116_output.json", part: 5 },
    { name: "toeic_part_6_from_131_output.json", part: 6 },
    { name: "toeic_part_6_from_139_output.json", part: 6 },
    { name: "toeic_part_7_from_147_output.json", part: 7 },
    { name: "toeic_part_7_from_163_output.json", part: 7 },
    { name: "toeic_part_7_from_183_output.json", part: 7 },
  ];

  let overallSortOrder = 1;

  for (const target of targetFiles) {
    const fullFilePath = path.join(PIPELINE_DIR, target.name);

    if (!fs.existsSync(fullFilePath)) {
      console.log(`⚠️ Không tìm thấy file (Bỏ qua): ${target.name}`);
      continue;
    }

    const questionsData = JSON.parse(fs.readFileSync(fullFilePath, "utf-8"));
    console.log(
      `📦 Đang xử lý Part ${target.part} -> File: ${target.name} (${questionsData.length} câu)`,
    );

    for (const q of questionsData) {
      let imagePath = null;
      let audioPath = null;

      // Xử lý link ảnh nếu câu hỏi đó yêu cầu hình ảnh (Thường ở Part 1)
      if (q.imagePrompt && q.imagePrompt.trim() !== "") {
        imagePath = `${CLOUDINARY_IMAGE_BASE}/${q.id}.jpg`;
      }

      // Xử lý link audio: format theo chuẩn tên mới bạn vừa đổi hàng loạt bằng lệnh rename/mv lúc nãy
      // Ví dụ: q-custom-p1-1 -> q-custom-audio-p1-1.mp3
      const audioFileName = q.id.replace("q-custom-", "q-custom-audio-");
      audioPath = `${CLOUDINARY_AUDIO_BASE}/${audioFileName}.mp3`;

      // 3. Insert dữ liệu sạch vào database Neon
      const newQuestion = await prisma.question.create({
        data: {
          id: q.id, // Dùng ID sinh ra từ file JSON để làm ID database
          content:
            q.content ||
            `Nghe và chọn đáp án chính xác cho câu hỏi số ${overallSortOrder}`,
          options: q.options, // Mảng JSON ['A', 'B', '...']
          right_answer: q.right_answer,
          category: "TOEIC",
          explanation:
            q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.",
          imagePath: imagePath,
          audioPath: audioPath,
          status: "ACTIVE",
        },
      });

      // 4. Liên kết câu hỏi vào bảng trung gian ExamQuestion
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: newQuestion.id,
          sortOrder: overallSortOrder,
          partNumber: target.part,
        },
      });

      overallSortOrder++;
    }
  }

  console.log(
    `\n🎉 [HOÀN THÀNH] Đã đồng bộ tổng cộng ${overallSortOrder - 1} câu hỏi lên Cloud Neon thành công!`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Lỗi trong quá trình seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
