import {
  AuthProvider,
  Gender,
  PermissionAction,
  PermissionScope,
} from "@prisma/client";
import bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/config/db";

// Cấu hình URL Cloudinary bao gồm cả Version và Folder đích
const CLOUDINARY_IMAGE_BASE =
  "https://res.cloudinary.com/mxxbk0jh/image/upload/f_auto,q_auto/v1783523250";

const CLOUDINARY_AUDIO_BASE =
  "https://res.cloudinary.com/mxxbk0jh/video/upload/v1783523250";

const PIPELINE_DIR = path.resolve("../toeicPipeline");

async function main() {
  console.log(
    "🌱 Starting full database seeding (Roles + Users + TOEIC Questions)...",
  );

  // ==========================================
  // BƯỚC 1: DỌN DẸP DỮ LIỆU CŨ (Tuân thủ thứ tự khóa ngoại FK)
  // ==========================================
  await prisma.examQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  console.log(
    "🧹 Cleaned existing records (Roles, Permissions, Users, Exams, Questions).",
  );

  // ==========================================
  // BƯỚC 2: SEED ROLES & PERMISSIONS
  // ==========================================
  // 1. Tạo Role ADMIN
  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      description: "Quản trị viên toàn quyền hệ thống",
    },
  });

  // 2. Tạo Role USER (Học viên)
  const userRole = await prisma.role.create({
    data: {
      name: "USER",
      description: "Học viên sử dụng hệ thống",
    },
  });

  // Danh sách tài nguyên chính trong hệ thống
  const resources = ["EXAM", "QUESTION", "FLASHCARD", "USER"];

  // Quyền cho ADMIN: Đầy đủ các hành động CREATE, READ, UPDATE, DELETE cho mọi tài nguyên
  const adminPermissionsData = resources.flatMap((resource) =>
    Object.values(PermissionAction).map((action) => ({
      roleId: adminRole.id,
      resource,
      scope: PermissionScope.SYSTEM_WISE,
      permission: action,
      allowed: true,
    })),
  );

  // Quyền cho USER: Chỉ xem (READ) toàn hệ thống, hoặc chỉnh sửa nội dung thuộc quyền sở hữu cá nhân
  const userPermissionsData = resources.flatMap((resource) => [
    {
      roleId: userRole.id,
      resource,
      scope: PermissionScope.SYSTEM_WISE,
      permission: PermissionAction.READ,
      allowed: true,
    },
    {
      roleId: userRole.id,
      resource,
      scope: PermissionScope.USER_WISE,
      permission: PermissionAction.CREATE,
      allowed: true,
    },
    {
      roleId: userRole.id,
      resource,
      scope: PermissionScope.USER_WISE,
      permission: PermissionAction.UPDATE,
      allowed: true,
    },
  ]);

  await prisma.permission.createMany({
    data: [...adminPermissionsData, ...userPermissionsData],
  });

  console.log("🔐 Seeded Roles (ADMIN, USER) and default Permissions.");

  // ==========================================
  // BƯỚC 3: SEED TÀI KHOẢN USER TEST (Gán Role ADMIN)
  // ==========================================
  const plainPassword = "vuongdeptrai";
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  const testUser = await prisma.user.create({
    data: {
      email: "truongvuon235@gmail.com",
      password: hashedPassword,
      name: "Truong Quoc Vuong",
      phoneNumber: "0912345678",
      gender: Gender.MALE,
      provider: AuthProvider.EMAIL,
      roleId: adminRole.id, // Gán Role ADMIN cho user test
      refreshTokens: [],
    },
  });

  console.log(
    `👤 Seeded user: ${testUser.name} (${testUser.email}) with ADMIN role`,
  );

  // ==========================================
  // BƯỚC 4: ĐỌC VÀ SEED DỮ LIỆU TỪ 14 FILE JSON PIPELINE
  // ==========================================
  const exam = await prisma.exam.create({
    data: {
      name: "Đề thi thử TOEIC Tổng Hợp Full Parts",
      category: "TOEIC",
      time: 120,
      status: "ACTIVE",
    },
  });

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
      let imagePath: string | null = null;
      let audioPath: string | null = null;

      // 1. Xử lý đường dẫn hình ảnh cho Part 1
      if (q.imagePrompt && q.imagePrompt.trim() !== "") {
        imagePath = `${CLOUDINARY_IMAGE_BASE}/${q.id}.jpg`;
      }

      // 2. Chuyển đổi audioPath
      if (q.audioPath && q.audioPath.trim() !== "") {
        const rawFileName = path.basename(q.audioPath);
        const correctAudioFileName = rawFileName.replace(
          "q-custom-",
          "q-custom-audio-",
        );
        audioPath = `${CLOUDINARY_AUDIO_BASE}/${correctAudioFileName}`;
      }

      const newQuestion = await prisma.question.create({
        data: {
          id: q.id,
          content:
            q.content ||
            `Nghe và chọn đáp án chính xác cho câu hỏi số ${overallSortOrder}`,
          options: q.options,
          right_answer: q.right_answer,
          category: "TOEIC",
          explanation:
            q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.",
          imagePath: imagePath,
          audioPath: audioPath,
          status: "ACTIVE",
        },
      });

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
    `\n✅ Seeding completed successfully! Total questions added: ${overallSortOrder - 1}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
