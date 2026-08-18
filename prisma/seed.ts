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

// Cloudinary Base URLs
const CLOUDINARY_IMAGE_BASE =
  "https://res.cloudinary.com/mxxbk0jh/image/upload/f_auto,q_auto/v1783523250";

const CLOUDINARY_AUDIO_BASE =
  "https://res.cloudinary.com/mxxbk0jh/video/upload/v1783523250";

const PIPELINE_DIR = path.resolve("../toeicPipeline");

interface QuestionJson {
  id?: string; // Original pipeline string identifier (if any)
  content?: string;
  options: Record<string, string>;
  right_answer: string;
  explanation?: string;
  partNumber: number;
  sortOrder: number;
  audioPath?: string;
  imagePrompt?: string;
}

async function main() {
  console.log(
    "🌱 Starting full database seeding (Roles + Users + TOEIC Exam Parts & Questions)...",
  );

  // ==========================================
  // STEP 1: CLEAN EXISTING DATA (Enforce FK Order)
  // ==========================================
  await prisma.examQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.examPart.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  console.log(
    "🧹 Cleaned existing records (Roles, Permissions, Users, Exams, ExamParts, Questions).",
  );

  // ==========================================
  // STEP 2: SEED ROLES & PERMISSIONS
  // ==========================================
  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      description: "Quản trị viên toàn quyền hệ thống",
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: "USER",
      description: "Học viên sử dụng hệ thống",
    },
  });

  const resources = ["EXAM", "QUESTION", "FLASHCARD", "USER"];

  const adminPermissionsData = resources.flatMap((resource) =>
    Object.values(PermissionAction).map((action) => ({
      roleId: adminRole.id,
      resource,
      scope: PermissionScope.SYSTEM_WISE,
      permission: action,
      allowed: true,
    })),
  );

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
  // STEP 3: SEED TEST USER
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
      roleId: adminRole.id,
      refreshTokens: [],
    },
  });

  console.log(
    `👤 Seeded user: ${testUser.name} (${testUser.email}) with ADMIN role`,
  );

  // ==========================================
  // STEP 4: SEED EXAM & EXAM PARTS
  // ==========================================
  const exam = await prisma.exam.create({
    data: {
      name: "Đề thi thử TOEIC Tổng Hợp Full Parts",
      category: "TOEIC",
      time: 120,
      status: "ACTIVE",
    },
  });

  const toeicPartNames: Record<number, string> = {
    1: "Part 1: Photographs",
    2: "Part 2: Question-Response",
    3: "Part 3: Conversations",
    4: "Part 4: Talks",
    5: "Part 5: Incomplete Sentences",
    6: "Part 6: Text Completion",
    7: "Part 7: Reading Comprehension",
  };

  const partMap = new Map<number, string>(); // partNumber -> partId

  for (let pNum = 1; pNum <= 7; pNum++) {
    const createdPart = await prisma.examPart.create({
      data: {
        examId: exam.id,
        partNumber: pNum,
        name: toeicPartNames[pNum] || `Part ${pNum}`,
        sortOrder: pNum,
      },
    });
    partMap.set(pNum, createdPart.id);
  }

  console.log(`🧩 Created 7 ExamPart records for Exam ID: ${exam.id}.`);

  // ==========================================
  // STEP 5: READ AND SEED PIPELINE JSON QUESTIONS
  // ==========================================
  if (!fs.existsSync(PIPELINE_DIR)) {
    console.error(`❌ Directory ${PIPELINE_DIR} does not exist!`);
    return;
  }

  const jsonFiles = fs
    .readdirSync(PIPELINE_DIR)
    .filter((file) => file.endsWith(".json") && file.startsWith("toeic_part_"))
    .sort((a, b) => {
      const matchA = a.match(/from_(\d+)_/);
      const matchB = b.match(/from_(\d+)_/);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });

  console.log(`📁 Found ${jsonFiles.length} JSON files to process.`);

  let overallSortOrder = 1;
  const examQuestionsToCreate: {
    partId: string;
    questionId: number;
    sortOrder: number;
  }[] = [];

  for (const fileName of jsonFiles) {
    const fullFilePath = path.join(PIPELINE_DIR, fileName);
    const questionsData: QuestionJson[] = JSON.parse(
      fs.readFileSync(fullFilePath, "utf-8"),
    );

    console.log(
      `📦 Processing File: ${fileName} (${questionsData.length} questions)`,
    );

    for (const q of questionsData) {
      let imagePath: string | null = null;
      let audioPath: string | null = null;

      if (q.imagePrompt && q.imagePrompt.trim() !== "") {
        imagePath = `${CLOUDINARY_IMAGE_BASE}/${q.id}.jpg`;
      }

      if (q.audioPath && q.audioPath.trim() !== "") {
        const rawFileName = path.basename(q.audioPath);
        const correctAudioFileName = rawFileName.replace(
          /^q-custom-/,
          "q-custom-audio-",
        );
        audioPath = `${CLOUDINARY_AUDIO_BASE}/${correctAudioFileName}`;
      }

      const targetPartId = partMap.get(q.partNumber);
      if (!targetPartId) {
        console.warn(
          `⚠️ Skipping question: No ExamPart found for part number ${q.partNumber}`,
        );
        continue;
      }

      // Create Question record and allow PostgreSQL autoincrement to generate the integer primary key
      const createdQuestion = await prisma.question.create({
        data: {
          content:
            q.content ||
            `Nghe và chọn đáp án chính xác cho câu hỏi số ${overallSortOrder}`,
          options: q.options,
          right_answer: q.right_answer,
          category: "TOEIC",
          partNumber: q.partNumber,
          explanation:
            q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.",
          imagePath,
          audioPath,
          status: "ACTIVE",
        },
      });

      examQuestionsToCreate.push({
        partId: targetPartId,
        questionId: createdQuestion.id, // Primary key is now integer
        sortOrder: overallSortOrder,
      });

      overallSortOrder++;
    }
  }

  // Link Questions to Exam Parts
  if (examQuestionsToCreate.length > 0) {
    console.log("🚀 Inserting exam linkages into DB...");
    await prisma.examQuestion.createMany({
      data: examQuestionsToCreate,
      skipDuplicates: true,
    });
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
