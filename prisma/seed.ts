import {
  AuthProvider,
  BoxLevel,
  DeckStatus,
  DeckVisibility,
  ExamCategory,
  ExamStatus,
  Gender,
  NewsCategory,
  NewsStatus,
  PermissionAction,
  PermissionScope,
  PostStatus,
  QuestionStatus,
  VoteType,
  ChannelStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/config/db";

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  users: 100,

  exams: 50,

  // Each user gets this many exam attempts.
  examHistoriesPerUser: 100,

  decks: 50,
  flashcards: 1000,

  forumCategories: 10,
  forumPosts: 500,
  forumComments: 2000,

  // Maximum number of votes to generate.
  postVotes: 2500,
  commentVotes: 5000,

  savedPosts: 1000,

  chatChannels: 20,
  chatMessages: 5000,

  news: 100,
  newsTags: 40,

  // Percentage of user/card combinations that receive progress.
  // 0.10 = approximately 10,000 progress records
  flashcardProgressRate: 0.1,
};

// Change this whenever you want a different dataset.
//
// Same seed = same generated data.
// Different seed = different generated data.
const RANDOM_SEED = 12345;

faker.seed(RANDOM_SEED);

// ============================================================
// CLOUDINARY
// ============================================================

const CLOUDINARY_IMAGE_BASE =
  "https://res.cloudinary.com/mxxbk0jh/image/upload/f_auto,q_auto/v1783523250";

const CLOUDINARY_AUDIO_BASE =
  "https://res.cloudinary.com/mxxbk0jh/video/upload/v1783523250";

// ============================================================
// PIPELINE
// ============================================================

const PIPELINE_DIR = path.resolve("../toeicPipeline");

interface QuestionJson {
  id?: string;
  content?: string;
  options: Record<string, string>;
  right_answer: string;
  explanation?: string;
  partNumber: number;
  sortOrder: number;
  audioPath?: string;
  imagePrompt?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const TOEIC_PART_NAMES: Record<number, string> = {
  1: "Part 1: Photographs",
  2: "Part 2: Question-Response",
  3: "Part 3: Conversations",
  4: "Part 4: Talks",
  5: "Part 5: Incomplete Sentences",
  6: "Part 6: Text Completion",
  7: "Part 7: Reading Comprehension",
};

const FORUM_CATEGORY_NAMES = [
  "TOEIC Discussion",
  "IELTS Discussion",
  "English Grammar",
  "Vocabulary",
  "Listening Practice",
  "Reading Practice",
  "Study Tips",
  "Exam Experience",
  "General English",
  "Community",
];

const CHAT_CHANNEL_NAMES = [
  "General English",
  "TOEIC Study",
  "IELTS Study",
  "Vocabulary",
  "Grammar",
  "Listening",
  "Reading",
  "Speaking",
  "Study Together",
  "Daily English",
  "Exam Preparation",
  "Beginner English",
  "Advanced English",
  "Study Motivation",
  "Questions & Answers",
  "Off Topic",
  "English Challenges",
  "Tips & Tricks",
  "Language Exchange",
  "Community Lounge",
];

const NEWS_TAG_NAMES = [
  "TOEIC",
  "IELTS",
  "Grammar",
  "Vocabulary",
  "Listening",
  "Reading",
  "Speaking",
  "Study Tips",
  "Exam Tips",
  "English Learning",
  "Announcement",
  "Updates",
  "Community",
  "Practice",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Education",
  "Learning",
  "Featured",
  "Tips",
  "Resources",
  "Testing",
  "Preparation",
  "Daily English",
  "Challenge",
  "Vocabulary Builder",
  "Grammar Tips",
  "Listening Tips",
  "Reading Tips",
  "TOEIC Part 1",
  "TOEIC Part 2",
  "TOEIC Part 3",
  "TOEIC Part 4",
  "TOEIC Part 5",
  "TOEIC Part 6",
  "TOEIC Part 7",
  "News",
  "Platform",
];

// ============================================================
// HELPERS
// ============================================================

function randomElement<T>(items: T[]): T {
  return items[faker.number.int({ min: 0, max: items.length - 1 })];
}

function randomInt(min: number, max: number): number {
  return faker.number.int({ min, max });
}

function randomBoolean(probability = 0.5): boolean {
  return faker.datatype.boolean({ probability });
}

function randomDateBetween(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

function uniqueSlug(value: string, index: number): string {
  return `${faker.helpers.slugify(value).toLowerCase()}-${index + 1}`;
}

function randomGender(): Gender {
  return randomElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]);
}

function randomExamCategory(): ExamCategory {
  return randomElement([
    ExamCategory.TOEIC,
    ExamCategory.IELTS,
    ExamCategory.GENERAL,
  ]);
}

function randomBox(): BoxLevel {
  return randomElement([
    BoxLevel.BOX_1,
    BoxLevel.BOX_2,
    BoxLevel.BOX_3,
    BoxLevel.BOX_4,
    BoxLevel.BOX_5,
    BoxLevel.BOX_6,
    BoxLevel.BOX_7,
  ]);
}

function randomPastDate(): Date {
  const now = new Date();

  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);

  return randomDateBetween(start, now);
}

// ============================================================
// STEP 1 — CLEAN DATABASE
// ============================================================

async function cleanDatabase() {
  console.log("🧹 Cleaning database...");

  // ----------------------------------------------------------
  // Many-to-many / dependent tables first
  // ----------------------------------------------------------

  await prisma.examQuestion.deleteMany({});

  await prisma.examHistory.deleteMany({});

  await prisma.flashcardProgress.deleteMany({});
  await prisma.userDeckProgress.deleteMany({});

  await prisma.newsTagRelation.deleteMany({});

  await prisma.forumPostVote.deleteMany({});
  await prisma.forumCommentVote.deleteMany({});
  await prisma.savedPost.deleteMany({});

  await prisma.forumComment.deleteMany({});
  await prisma.forumPost.deleteMany({});
  await prisma.forumCategory.deleteMany({});

  await prisma.chatMessage.deleteMany({});
  await prisma.chatChannel.deleteMany({});

  await prisma.news.deleteMany({});
  await prisma.newsTag.deleteMany({});

  await prisma.flashcard.deleteMany({});
  await prisma.deck.deleteMany({});

  await prisma.questionSkill.deleteMany({});
  await prisma.skill.deleteMany({});

  await prisma.question.deleteMany({});

  await prisma.examPart.deleteMany({});
  await prisma.exam.deleteMany({});

  await prisma.user.deleteMany({});

  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});

  console.log("✅ Database cleaned.");
}

// ============================================================
// STEP 2 — ROLES & PERMISSIONS
// ============================================================

async function seedRoles() {
  console.log("🔐 Creating roles and permissions...");

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

  const resources = [
    "EXAM",
    "QUESTION",
    "FLASHCARD",
    "USER",
    "FORUM",
    "NEWS",
    "CHAT",
  ];

  const adminPermissions = resources.flatMap((resource) =>
    Object.values(PermissionAction).map((action) => ({
      roleId: adminRole.id,
      resource,
      scope: PermissionScope.SYSTEM_WISE,
      permission: action,
      allowed: true,
    })),
  );

  const userPermissions = resources.flatMap((resource) => [
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
    data: [...adminPermissions, ...userPermissions],
  });

  console.log("✅ Roles and permissions created.");

  return {
    adminRole,
    userRole,
  };
}

// ============================================================
// STEP 3 — USERS
// ============================================================

async function seedUsers(userRoleId: number, adminRoleId: number) {
  console.log(`👤 Creating ${CONFIG.users} generated users...`);

  const password = await bcrypt.hash("password123", 10);

  const generatedUsersData = Array.from(
    { length: CONFIG.users },
    (_, index) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      return {
        email: `user${String(index + 1).padStart(4, "0")}@example.com`,
        password,
        name: `${firstName} ${lastName}`,
        phoneNumber: faker.phone.number(),
        gender: randomGender(),
        provider: AuthProvider.EMAIL,
        roleId: userRoleId,
        refreshTokens: [],
      };
    },
  );

  await prisma.user.createMany({
    data: generatedUsersData,
  });

  const generatedUsers = await prisma.user.findMany({
    where: {
      roleId: userRoleId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // ----------------------------------------------------------
  // Preserve your real admin account
  // ----------------------------------------------------------

  const adminPassword = await bcrypt.hash("vuongdeptrai", 10);

  const admin = await prisma.user.create({
    data: {
      email: "truongvuon235@gmail.com",
      password: adminPassword,
      name: "Truong Quoc Vuong",
      phoneNumber: "0912345678",
      gender: Gender.MALE,
      provider: AuthProvider.EMAIL,
      roleId: adminRoleId,
      refreshTokens: [],
    },
  });

  console.log(`✅ Created ${generatedUsers.length} users + 1 admin.`);

  return {
    users: generatedUsers,
    admin,
  };
}

// ============================================================
// QUESTION SKILLS
// ============================================================

type SkillClassification = {
  skill: string;
  skillSlug: string;
  subSkill: string;
  subSkillSlug: string;
};

const SKILL_TAXONOMY = [
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Visual Description",
    subSkillSlug: "visual-description",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Actions & Activities",
    subSkillSlug: "actions-activities",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "People & Situations",
    subSkillSlug: "people-situations",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Places & Travel",
    subSkillSlug: "places-travel",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Objects & Locations",
    subSkillSlug: "objects-locations",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "WH Questions",
    subSkillSlug: "wh-questions",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Yes/No Questions",
    subSkillSlug: "yes-no-questions",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Choice Questions",
    subSkillSlug: "choice-questions",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Indirect Responses",
    subSkillSlug: "indirect-responses",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Main Idea",
    subSkillSlug: "main-idea-listening",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Specific Details",
    subSkillSlug: "specific-details-listening",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Inference",
    subSkillSlug: "inference-listening",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Speaker Intent",
    subSkillSlug: "speaker-intent",
  },
  {
    skill: "Listening Comprehension",
    skillSlug: "listening-comprehension",
    subSkill: "Speaker Purpose",
    subSkillSlug: "speaker-purpose",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Verb Form",
    subSkillSlug: "verb-form",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Verb Tense",
    subSkillSlug: "verb-tense",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Subject-Verb Agreement",
    subSkillSlug: "subject-verb-agreement",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Prepositions",
    subSkillSlug: "prepositions",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Articles",
    subSkillSlug: "articles",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Pronouns",
    subSkillSlug: "pronouns",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Sentence Structure",
    subSkillSlug: "sentence-structure",
  },
  {
    skill: "Grammar",
    skillSlug: "grammar",
    subSkill: "Grammar in Context",
    subSkillSlug: "grammar-in-context",
  },
  {
    skill: "Vocabulary",
    skillSlug: "vocabulary",
    subSkill: "Word Meaning",
    subSkillSlug: "word-meaning",
  },
  {
    skill: "Vocabulary",
    skillSlug: "vocabulary",
    subSkill: "Word Form",
    subSkillSlug: "word-form",
  },
  {
    skill: "Vocabulary",
    skillSlug: "vocabulary",
    subSkill: "Collocations",
    subSkillSlug: "collocations",
  },
  {
    skill: "Vocabulary",
    skillSlug: "vocabulary",
    subSkill: "Contextual Vocabulary",
    subSkillSlug: "contextual-vocabulary",
  },
  {
    skill: "Reading Comprehension",
    skillSlug: "reading-comprehension",
    subSkill: "Main Idea",
    subSkillSlug: "main-idea-reading",
  },
  {
    skill: "Reading Comprehension",
    skillSlug: "reading-comprehension",
    subSkill: "Specific Details",
    subSkillSlug: "specific-details-reading",
  },
  {
    skill: "Reading Comprehension",
    skillSlug: "reading-comprehension",
    subSkill: "Inference",
    subSkillSlug: "inference-reading",
  },
  {
    skill: "Reading Comprehension",
    skillSlug: "reading-comprehension",
    subSkill: "Vocabulary in Context",
    subSkillSlug: "vocabulary-in-context",
  },
  {
    skill: "Reading Comprehension",
    skillSlug: "reading-comprehension",
    subSkill: "Paraphrase",
    subSkillSlug: "paraphrase",
  },
] as const;

function classifyQuestion(q: QuestionJson): SkillClassification {
  const text = [
    q.content,
    q.explanation,
    q.imagePrompt,
    ...Object.values(q.options),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const part = q.partNumber;

  const result = (
    skill: string,
    skillSlug: string,
    subSkill: string,
    subSkillSlug: string,
  ) => ({ skill, skillSlug, subSkill, subSkillSlug });

  if (part === 1) {
    if (/airport|flight|vacation|travel|suitcase|departure|arrival/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Places & Travel",
        "places-travel",
      );
    if (
      /store|shop|shopping|price|product|grocer|catalog|buy|purchase/.test(text)
    )
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Objects & Locations",
        "objects-locations",
      );
    if (
      /meeting|conference|office|class|school|hospital|restaurant|party/.test(
        text,
      )
    )
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "People & Situations",
        "people-situations",
      );
    if (
      /holding|sitting|standing|walking|working|studying|cooking|baking|washing|writing|reading|playing|watching|using|carrying|looking/.test(
        text,
      )
    )
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Actions & Activities",
        "actions-activities",
      );
    return result(
      "Listening Comprehension",
      "listening-comprehension",
      "Visual Description",
      "visual-description",
    );
  }

  if (part === 2) {
    if (/\bwhat|\bwhere|\bwhen|\bwho|\bwhy|\bhow/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "WH Questions",
        "wh-questions",
      );
    if (
      /\bdo|\bdoes|\bdid|\bis|\bare|\bwas|\bwere|\bcan|\bcould|\bwill|\bwould|\bhas|\bhave/.test(
        text,
      )
    )
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Yes/No Questions",
        "yes-no-questions",
      );
    if (/\bor\b/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Choice Questions",
        "choice-questions",
      );
    return result(
      "Listening Comprehension",
      "listening-comprehension",
      "Indirect Responses",
      "indirect-responses",
    );
  }

  if (part === 3 || part === 4) {
    if (/why|purpose|reason|intended|mainly|primary purpose/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        part === 4 ? "Speaker Purpose" : "Speaker Intent",
        part === 4 ? "speaker-purpose" : "speaker-intent",
      );
    if (/infer|imply|likely|suggest|probably|indicated/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Inference",
        "inference-listening",
      );
    if (/main idea|mainly|topic|conversation about|talk about/.test(text))
      return result(
        "Listening Comprehension",
        "listening-comprehension",
        "Main Idea",
        "main-idea-listening",
      );
    return result(
      "Listening Comprehension",
      "listening-comprehension",
      "Specific Details",
      "specific-details-listening",
    );
  }

  if (part === 5 || part === 6) {
    const options = Object.values(q.options).map((x) => x.toLowerCase());
    const optionText = options.join(" ");
    const stem = q.content?.toLowerCase() ?? "";

    if (
      /\b(ing|ed)\b/.test(optionText) &&
      /(is|are|was|were|has been|have been|had been|will be|to)\b/.test(stem)
    ) {
      return result("Grammar", "grammar", "Verb Form", "verb-form");
    }
    if (
      /\b(a|an|the)\b/.test(optionText) &&
      /\b(a|an|the)\b/.test(optionText)
    ) {
      return result("Grammar", "grammar", "Articles", "articles");
    }
    if (
      /\b(in|on|at|for|to|from|with|by|of|into|during|between)\b/.test(
        optionText,
      )
    ) {
      return result("Grammar", "grammar", "Prepositions", "prepositions");
    }
    if (
      /\b(he|she|it|they|them|their|his|her|who|whom|which)\b/.test(optionText)
    ) {
      return result("Grammar", "grammar", "Pronouns", "pronouns");
    }
    if (
      /(has|have|had|is|are|was|were)\s+been/.test(stem) ||
      /\b(yesterday|last|ago|currently|now|tomorrow|next)\b/.test(stem)
    ) {
      return result("Grammar", "grammar", "Verb Tense", "verb-tense");
    }
    if (/\b(and|but|or|because|although|while|if|unless)\b/.test(stem)) {
      return result(
        "Grammar",
        "grammar",
        "Sentence Structure",
        "sentence-structure",
      );
    }
    if (part === 6) {
      return result(
        "Grammar",
        "grammar",
        "Grammar in Context",
        "grammar-in-context",
      );
    }
    if (
      /\b(all of the above|meaning|means|synonym|similar|appropriate|suitable|experienced|skilled|knowledgeable)\b/.test(
        text,
      )
    ) {
      return result("Vocabulary", "vocabulary", "Word Meaning", "word-meaning");
    }
    if (/\b(ly|tion|ment|ness|ity|ive|ous|al|ful|less)\b/.test(optionText)) {
      return result("Vocabulary", "vocabulary", "Word Form", "word-form");
    }
    return result(
      "Vocabulary",
      "vocabulary",
      "Contextual Vocabulary",
      "contextual-vocabulary",
    );
  }

  if (part === 7) {
    if (/infer|imply|suggest|probably|likely|indicate/.test(text))
      return result(
        "Reading Comprehension",
        "reading-comprehension",
        "Inference",
        "inference-reading",
      );
    if (
      /meaning|closest in meaning|refers to|word .* means|vocabulary/.test(text)
    )
      return result(
        "Reading Comprehension",
        "reading-comprehension",
        "Vocabulary in Context",
        "vocabulary-in-context",
      );
    if (/paraphrase|best expresses|closest meaning|means that/.test(text))
      return result(
        "Reading Comprehension",
        "reading-comprehension",
        "Paraphrase",
        "paraphrase",
      );
    if (/main idea|mainly|purpose|topic|primarily about/.test(text))
      return result(
        "Reading Comprehension",
        "reading-comprehension",
        "Main Idea",
        "main-idea-reading",
      );
    return result(
      "Reading Comprehension",
      "reading-comprehension",
      "Specific Details",
      "specific-details-reading",
    );
  }

  return result(
    "Vocabulary",
    "vocabulary",
    "Contextual Vocabulary",
    "contextual-vocabulary",
  );
}

async function seedSkills() {
  console.log("🎯 Creating skill taxonomy...");

  const parentMap = new Map<string, number>();
  const skillIds = new Map<string, number>();

  for (const item of SKILL_TAXONOMY) {
    if (!parentMap.has(item.skillSlug)) {
      const skill = await prisma.skill.create({
        data: {
          name: item.skill,
          slug: item.skillSlug,
          description: `TOEIC ${item.skill} skill.`,
          category: ExamCategory.TOEIC,
        },
      });
      parentMap.set(item.skillSlug, skill.id);
      skillIds.set(item.skillSlug, skill.id);
    }
  }

  for (const item of SKILL_TAXONOMY) {
    const parentId = parentMap.get(item.skillSlug)!;
    const existing = await prisma.skill.findUnique({
      where: { slug: item.subSkillSlug },
    });
    const skill =
      existing ??
      (await prisma.skill.create({
        data: {
          name: item.subSkill,
          slug: item.subSkillSlug,
          description: `Subskill: ${item.subSkill}.`,
          category: ExamCategory.TOEIC,
          parentId,
        },
      }));
    skillIds.set(item.subSkillSlug, skill.id);
  }

  console.log(`✅ Created ${skillIds.size} skills/subskills.`);
  return skillIds;
}

async function seedQuestionSkills(
  questions: any[],
  skillIds: Map<string, number>,
  questionJsonByIndex: QuestionJson[],
) {
  console.log("🔗 Assigning skills to questions...");
  const relations: { questionId: number; skillId: number }[] = [];

  questions.forEach((question, index) => {
    const classification = classifyQuestion(questionJsonByIndex[index]);
    const parentId = skillIds.get(classification.skillSlug);
    const subSkillId = skillIds.get(classification.subSkillSlug);

    if (parentId)
      relations.push({ questionId: question.id, skillId: parentId });
    if (subSkillId)
      relations.push({ questionId: question.id, skillId: subSkillId });
  });

  await prisma.questionSkill.createMany({
    data: relations,
    skipDuplicates: true,
  });
  console.log(`✅ Created ${relations.length} QuestionSkill relationships.`);
}

// ============================================================
// STEP 4 — REAL QUESTION BANK
// ============================================================

async function seedQuestions() {
  console.log("📚 Loading real TOEIC questions...");

  if (!fs.existsSync(PIPELINE_DIR)) {
    throw new Error(`❌ Directory ${PIPELINE_DIR} does not exist!`);
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

  console.log(`📁 Found ${jsonFiles.length} JSON files.`);

  const allQuestionData: any[] = [];
  const allQuestionJson: QuestionJson[] = [];

  for (const fileName of jsonFiles) {
    const fullFilePath = path.join(PIPELINE_DIR, fileName);

    const questionsData: QuestionJson[] = JSON.parse(
      fs.readFileSync(fullFilePath, "utf-8"),
    );

    console.log(`   📦 ${fileName}: ${questionsData.length} questions`);

    for (const q of questionsData) {
      let imagePath: string | null = null;
      let audioPath: string | null = null;

      if (q.imagePrompt && q.imagePrompt.trim() !== "" && q.id) {
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

      allQuestionJson.push(q);

      allQuestionData.push({
        content: q.content || `Nghe và chọn đáp án chính xác cho câu hỏi.`,
        options: q.options,
        right_answer: q.right_answer,
        category: ExamCategory.TOEIC,
        partNumber: q.partNumber,
        explanation:
          q.explanation || "Chưa có lời giải chi tiết cho câu hỏi này.",
        imagePath,
        audioPath,
        status: QuestionStatus.ACTIVE,
      });
    }
  }

  await prisma.question.createMany({
    data: allQuestionData,
  });

  const questions = await prisma.question.findMany({
    orderBy: {
      id: "asc",
    },
  });

  console.log(`✅ Loaded ${questions.length} real TOEIC questions.`);

  return { questions, questionJson: allQuestionJson };
}

// ============================================================
// STEP 5 — EXAMS + PARTS + SHARED QUESTIONS
// ============================================================

async function seedExams(questions: any[]) {
  console.log(`📝 Creating ${CONFIG.exams} exams...`);

  const examsData = Array.from({ length: CONFIG.exams }, (_, index) => ({
    name: `TOEIC Practice Test ${String(index + 1).padStart(3, "0")}`,
    category: ExamCategory.TOEIC,
    time: randomInt(100, 120),
    status: randomElement([
      ExamStatus.ACTIVE,
      ExamStatus.ACTIVE,
      ExamStatus.ACTIVE,
      ExamStatus.INACTIVE,
    ]),
  }));

  await prisma.exam.createMany({
    data: examsData,
  });

  const exams = await prisma.exam.findMany({
    orderBy: {
      id: "asc",
    },
  });

  console.log(`✅ Created ${exams.length} exams.`);

  // ----------------------------------------------------------
  // Create 7 parts for every exam
  // ----------------------------------------------------------

  const examPartsData = [];

  for (const exam of exams) {
    for (let partNumber = 1; partNumber <= 7; partNumber++) {
      examPartsData.push({
        examId: exam.id,
        partNumber,
        name: TOEIC_PART_NAMES[partNumber] || `Part ${partNumber}`,
        instructions: `Complete TOEIC Part ${partNumber} according to the instructions.`,
        sortOrder: partNumber,
      });
    }
  }

  await prisma.examPart.createMany({
    data: examPartsData,
  });

  const examParts = await prisma.examPart.findMany({
    orderBy: [
      {
        examId: "asc",
      },
      {
        partNumber: "asc",
      },
    ],
  });

  console.log(`🧩 Created ${examParts.length} ExamParts.`);

  // ----------------------------------------------------------
  // SAME QUESTION BANK FOR EVERY EXAM
  // ----------------------------------------------------------

  const examQuestionsData: {
    partId: string;
    questionId: number;
    sortOrder: number;
  }[] = [];

  for (const examPart of examParts) {
    const partQuestions = questions.filter(
      (question) => question.partNumber === examPart.partNumber,
    );

    let sortOrder = 1;

    for (const question of partQuestions) {
      examQuestionsData.push({
        partId: examPart.id,
        questionId: question.id,
        sortOrder,
      });

      sortOrder++;
    }
  }

  await prisma.examQuestion.createMany({
    data: examQuestionsData,
    skipDuplicates: true,
  });

  console.log(`🔗 Created ${examQuestionsData.length} ExamQuestion links.`);

  return {
    exams,
    examParts,
  };
}

// ============================================================
// STEP 6 — EXAM HISTORIES
// ============================================================

async function seedExamHistories(users: any[], exams: any[], questions: any[]) {
  console.log(
    `📊 Creating ${CONFIG.examHistoriesPerUser} exam histories per user...`,
  );

  const histories = [];

  for (const user of users) {
    for (let attempt = 0; attempt < CONFIG.examHistoriesPerUser; attempt++) {
      const exam = randomElement(exams);

      const totalQuestions = questions.length;

      // Generate realistic performance.
      const accuracy = faker.number.float({
        min: 0.35,
        max: 0.98,
        fractionDigits: 2,
      });

      const correctQuestions = Math.min(
        totalQuestions,
        Math.max(0, Math.round(totalQuestions * accuracy)),
      );

      const score = Math.round((correctQuestions / totalQuestions) * 990);

      const isPassed = score >= 600;

      const startedAt = randomPastDate();

      // Duration between 20 minutes and exam maximum.
      const timeTakenSeconds = randomInt(20 * 60, 120 * 60);

      const submittedAt = new Date(
        startedAt.getTime() + timeTakenSeconds * 1000,
      );

      // Keep answers reasonably sized.
      //
      // Instead of duplicating the entire question snapshot
      // 10,000 times, we store question IDs + selected answers.
      const answerCount = Math.min(
        totalQuestions,
        randomInt(Math.floor(totalQuestions * 0.8), totalQuestions),
      );

      const shuffledQuestions = faker.helpers.shuffle(questions);

      const answers: Record<string, string | null> = {};

      for (let i = 0; i < answerCount; i++) {
        const question = shuffledQuestions[i];

        const options = Object.keys(question.options as Record<string, string>);

        answers[String(question.id)] = randomBoolean(0.9)
          ? randomElement(options)
          : null;
      }

      histories.push({
        userId: user.id,
        examId: exam.id,
        score,
        totalQuestions,
        correctQuestions,
        isPassed,
        answers,
        startedAt,
        submittedAt,
        timeTakenSeconds,
      });
    }
  }

  // createMany in chunks so we don't send an enormous
  // request to PostgreSQL at once.
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < histories.length; i += CHUNK_SIZE) {
    const chunk = histories.slice(i, i + CHUNK_SIZE);

    await prisma.examHistory.createMany({
      data: chunk,
    });

    console.log(
      `   📈 Exam histories: ${Math.min(
        i + CHUNK_SIZE,
        histories.length,
      )}/${histories.length}`,
    );
  }

  console.log(`✅ Created ${histories.length} exam histories.`);
}

// ============================================================
// STEP 7 — DECKS
// ============================================================

async function seedDecks(users: any[]) {
  console.log(`🗂️ Creating ${CONFIG.decks} decks...`);

  const decksData = Array.from({ length: CONFIG.decks }, (_, index) => {
    const creator = randomElement(users);

    return {
      name: `English Vocabulary Deck ${index + 1}`,
      description: "Generated vocabulary deck for English learning practice.",
      category: randomExamCategory(),
      status: DeckStatus.ACTIVE,
      visibility: randomElement([
        DeckVisibility.PUBLIC,
        DeckVisibility.PUBLIC,
        DeckVisibility.PRIVATE,
      ]),
      creatorId: creator.id,
    };
  });

  await prisma.deck.createMany({
    data: decksData,
  });

  const decks = await prisma.deck.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${decks.length} decks.`);

  return decks;
}

// ============================================================
// STEP 8 — FLASHCARDS
// ============================================================

async function seedFlashcards(decks: any[], users: any[], questions: any[]) {
  console.log(`🃏 Creating ${CONFIG.flashcards} flashcards...`);

  const flashcardsData = [];

  for (let i = 0; i < CONFIG.flashcards; i++) {
    const deck = randomElement(decks);
    const creator = randomElement(users);

    // Reuse real question content where possible.
    const question = randomElement(questions);

    flashcardsData.push({
      deckId: deck.id,
      frontContent: question.content || faker.lorem.sentence(),
      backContent:
        question.explanation || question.right_answer || faker.lorem.sentence(),
      explanation:
        question.explanation || "Review this vocabulary item regularly.",
      imagePath: question.imagePath,
      audioPath: question.audioPath,
      partNumber: question.partNumber,
      status: DeckStatus.ACTIVE,
      creatorId: creator.id,
    });
  }

  const CHUNK_SIZE = 1000;

  for (let i = 0; i < flashcardsData.length; i += CHUNK_SIZE) {
    await prisma.flashcard.createMany({
      data: flashcardsData.slice(i, i + CHUNK_SIZE),
    });
  }

  const flashcards = await prisma.flashcard.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${flashcards.length} flashcards.`);

  return flashcards;
}

// ============================================================
// STEP 9 — FLASHCARD PROGRESS
// ============================================================

async function seedFlashcardProgress(users: any[], flashcards: any[]) {
  console.log("📚 Creating flashcard progress...");

  const progressData = [];

  for (const user of users) {
    for (const flashcard of flashcards) {
      if (
        faker.number.float({
          min: 0,
          max: 1,
        }) > CONFIG.flashcardProgressRate
      ) {
        continue;
      }

      const box = randomBox();

      const repetitions = randomInt(0, 30);

      const intervalDays =
        box === BoxLevel.BOX_1
          ? 1
          : box === BoxLevel.BOX_2
            ? 2
            : box === BoxLevel.BOX_3
              ? 4
              : box === BoxLevel.BOX_4
                ? 7
                : box === BoxLevel.BOX_5
                  ? 15
                  : box === BoxLevel.BOX_6
                    ? 30
                    : 365;

      const lastReviewedAt = randomBoolean(0.8) ? randomPastDate() : null;

      const nextReviewAt = new Date();

      nextReviewAt.setDate(
        nextReviewAt.getDate() + randomInt(-7, intervalDays),
      );

      progressData.push({
        userId: user.id,
        flashcardId: flashcard.id,
        box,
        intervalDays,
        easeFactor: faker.number.float({
          min: 1.3,
          max: 3.0,
          fractionDigits: 2,
        }),
        repetitions,
        nextReviewAt,
        lastReviewedAt,
      });
    }
  }

  const CHUNK_SIZE = 1000;

  for (let i = 0; i < progressData.length; i += CHUNK_SIZE) {
    await prisma.flashcardProgress.createMany({
      data: progressData.slice(i, i + CHUNK_SIZE),
      skipDuplicates: true,
    });
  }

  console.log(
    `✅ Created approximately ${progressData.length} flashcard progress records.`,
  );
}

// ============================================================
// STEP 10 — USER DECK PROGRESS
// ============================================================

async function seedUserDeckProgress(users: any[], decks: any[]) {
  console.log("📖 Creating user deck progress...");

  const progressData = [];

  for (const user of users) {
    for (const deck of decks) {
      // Not every user studies every deck.
      if (!randomBoolean(0.35)) {
        continue;
      }

      const totalCardsViewed = randomInt(0, 500);

      const masteredCards = randomInt(0, Math.min(totalCardsViewed, 200));

      progressData.push({
        userId: user.id,
        deckId: deck.id,
        totalCardsViewed,
        masteredCards,
        lastStudiedAt: randomPastDate(),
      });
    }
  }

  await prisma.userDeckProgress.createMany({
    data: progressData,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${progressData.length} deck progress records.`);
}

// ============================================================
// STEP 11 — FORUM CATEGORIES
// ============================================================

async function seedForumCategories() {
  console.log(`💬 Creating ${CONFIG.forumCategories} forum categories...`);

  const categoriesData = FORUM_CATEGORY_NAMES.slice(
    0,
    CONFIG.forumCategories,
  ).map((name, index) => ({
    name,
    slug: uniqueSlug(name, index),
    description: `Discussion area for ${name}.`,
    icon: "💬",
    isPrivate: false,
  }));

  await prisma.forumCategory.createMany({
    data: categoriesData,
  });

  const categories = await prisma.forumCategory.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${categories.length} forum categories.`);

  return categories;
}

// ============================================================
// STEP 12 — FORUM POSTS
// ============================================================

async function seedForumPosts(categories: any[], users: any[]) {
  console.log(`📝 Creating ${CONFIG.forumPosts} forum posts...`);

  const postsData = Array.from({ length: CONFIG.forumPosts }, (_, index) => {
    const category = randomElement(categories);

    const author = randomElement(users);

    const title = faker.lorem.sentence({
      min: 4,
      max: 10,
    });

    const upvotes = randomInt(0, 100);
    const downvotes = randomInt(0, 20);

    return {
      title,
      slug: uniqueSlug(title, index),
      content: faker.lorem.paragraphs({
        min: 1,
        max: 4,
      }),
      attachments: [],
      status: randomElement([
        PostStatus.PUBLISHED,
        PostStatus.PUBLISHED,
        PostStatus.PUBLISHED,
        PostStatus.ARCHIVED,
      ]),
      isPinned: randomBoolean(0.03),
      isLocked: randomBoolean(0.05),
      viewsCount: randomInt(0, 5000),
      upvotesCount: upvotes,
      downvotesCount: downvotes,
      categoryId: category.id,
      authorId: author.id,
      createdAt: randomPastDate(),
    };
  });

  const CHUNK_SIZE = 500;

  for (let i = 0; i < postsData.length; i += CHUNK_SIZE) {
    await prisma.forumPost.createMany({
      data: postsData.slice(i, i + CHUNK_SIZE),
    });
  }

  const posts = await prisma.forumPost.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${posts.length} forum posts.`);

  return posts;
}

// ============================================================
// STEP 13 — FORUM COMMENTS
// ============================================================

async function seedForumComments(posts: any[], users: any[]) {
  console.log(`💭 Creating ${CONFIG.forumComments} comments...`);

  const commentsData = [];

  // First create comments without parents.
  for (let i = 0; i < CONFIG.forumComments; i++) {
    const post = randomElement(posts);
    const author = randomElement(users);

    commentsData.push({
      content: faker.lorem.paragraph(randomInt(1, 3)),
      isEdited: randomBoolean(0.1),
      upvotesCount: randomInt(0, 30),
      downvotesCount: randomInt(0, 5),
      postId: post.id,
      authorId: author.id,
      parentId: null,
      createdAt: randomPastDate(),
    });
  }

  const CHUNK_SIZE = 500;

  for (let i = 0; i < commentsData.length; i += CHUNK_SIZE) {
    await prisma.forumComment.createMany({
      data: commentsData.slice(i, i + CHUNK_SIZE),
    });
  }

  let comments = await prisma.forumComment.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  // ----------------------------------------------------------
  // Add nested replies to some existing comments.
  // ----------------------------------------------------------

  const replyData = [];

  const replyCount = Math.floor(CONFIG.forumComments * 0.25);

  for (let i = 0; i < replyCount; i++) {
    const parent = randomElement(comments);
    const author = randomElement(users);

    replyData.push({
      content: faker.lorem.paragraph(randomInt(1, 2)),
      isEdited: randomBoolean(0.05),
      upvotesCount: randomInt(0, 20),
      downvotesCount: randomInt(0, 3),
      postId: parent.postId,
      authorId: author.id,
      parentId: parent.id,
      createdAt: randomPastDate(),
    });
  }

  for (let i = 0; i < replyData.length; i += CHUNK_SIZE) {
    await prisma.forumComment.createMany({
      data: replyData.slice(i, i + CHUNK_SIZE),
    });
  }

  comments = await prisma.forumComment.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${comments.length} forum comments.`);

  return comments;
}

// ============================================================
// STEP 14 — FORUM POST VOTES
// ============================================================

async function seedPostVotes(posts: any[], users: any[]) {
  console.log(`👍 Creating up to ${CONFIG.postVotes} post votes...`);

  const votes = [];
  const used = new Set<string>();

  while (votes.length < CONFIG.postVotes) {
    const user = randomElement(users);
    const post = randomElement(posts);

    const key = `${user.id}:${post.id}`;

    if (used.has(key)) {
      continue;
    }

    used.add(key);

    votes.push({
      userId: user.id,
      postId: post.id,
      type: randomElement([VoteType.UPVOTE, VoteType.DOWNVOTE]),
    });
  }

  await prisma.forumPostVote.createMany({
    data: votes,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${votes.length} post votes.`);
}

// ============================================================
// STEP 15 — FORUM COMMENT VOTES
// ============================================================

async function seedCommentVotes(comments: any[], users: any[]) {
  console.log(`👍 Creating up to ${CONFIG.commentVotes} comment votes...`);

  const maxPossible = comments.length * users.length;

  const target = Math.min(CONFIG.commentVotes, maxPossible);

  const votes = [];
  const used = new Set<string>();

  while (votes.length < target) {
    const user = randomElement(users);
    const comment = randomElement(comments);

    const key = `${user.id}:${comment.id}`;

    if (used.has(key)) {
      continue;
    }

    used.add(key);

    votes.push({
      userId: user.id,
      commentId: comment.id,
      type: randomElement([VoteType.UPVOTE, VoteType.DOWNVOTE]),
    });
  }

  await prisma.forumCommentVote.createMany({
    data: votes,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${votes.length} comment votes.`);
}

// ============================================================
// STEP 16 — SAVED POSTS
// ============================================================

async function seedSavedPosts(posts: any[], users: any[]) {
  console.log(`🔖 Creating up to ${CONFIG.savedPosts} saved posts...`);

  const maxPossible = posts.length * users.length;

  const target = Math.min(CONFIG.savedPosts, maxPossible);

  const savedPosts = [];
  const used = new Set<string>();

  while (savedPosts.length < target) {
    const user = randomElement(users);
    const post = randomElement(posts);

    const key = `${user.id}:${post.id}`;

    if (used.has(key)) {
      continue;
    }

    used.add(key);

    savedPosts.push({
      userId: user.id,
      postId: post.id,
    });
  }

  await prisma.savedPost.createMany({
    data: savedPosts,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${savedPosts.length} saved posts.`);
}

// ============================================================
// STEP 17 — CHAT CHANNELS
// ============================================================

async function seedChatChannels() {
  console.log(`💬 Creating ${CONFIG.chatChannels} chat channels...`);

  const channelsData = CHAT_CHANNEL_NAMES.slice(0, CONFIG.chatChannels).map(
    (name) => ({
      name,
      description: `Chat channel for ${name}.`,
      icon: "💬",
      status: ChannelStatus.ACTIVE,
    }),
  );

  await prisma.chatChannel.createMany({
    data: channelsData,
  });

  const channels = await prisma.chatChannel.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${channels.length} chat channels.`);

  return channels;
}

// ============================================================
// STEP 18 — CHAT MESSAGES
// ============================================================

async function seedChatMessages(channels: any[], users: any[]) {
  console.log(`💬 Creating ${CONFIG.chatMessages} chat messages...`);

  // First create normal messages.
  const messagesData = Array.from({ length: CONFIG.chatMessages }, () => {
    const channel = randomElement(channels);

    const sender = randomElement(users);

    return {
      channelId: channel.id,
      senderId: sender.id,
      content: faker.lorem.sentence({
        min: 3,
        max: 15,
      }),
      attachments: [],
      parentId: null,
      isEdited: randomBoolean(0.08),
      createdAt: randomPastDate(),
    };
  });

  const CHUNK_SIZE = 500;

  for (let i = 0; i < messagesData.length; i += CHUNK_SIZE) {
    await prisma.chatMessage.createMany({
      data: messagesData.slice(i, i + CHUNK_SIZE),
    });
  }

  let messages = await prisma.chatMessage.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  // ----------------------------------------------------------
  // Add replies to existing messages.
  // ----------------------------------------------------------

  const replyCount = Math.floor(messages.length * 0.2);

  const replies = [];

  for (let i = 0; i < replyCount; i++) {
    const parent = randomElement(messages);

    const sender = randomElement(users);

    replies.push({
      channelId: parent.channelId,
      senderId: sender.id,
      content: faker.lorem.sentence(),
      attachments: [],
      parentId: parent.id,
      isEdited: randomBoolean(0.05),
      createdAt: randomPastDate(),
    });
  }

  for (let i = 0; i < replies.length; i += CHUNK_SIZE) {
    await prisma.chatMessage.createMany({
      data: replies.slice(i, i + CHUNK_SIZE),
    });
  }

  messages = await prisma.chatMessage.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${messages.length} chat messages.`);
}

// ============================================================
// STEP 19 — NEWS TAGS
// ============================================================

async function seedNewsTags() {
  console.log(`🏷️ Creating ${CONFIG.newsTags} news tags...`);

  const tagNames = NEWS_TAG_NAMES.slice(0, CONFIG.newsTags);

  const tagsData = tagNames.map((name, index) => ({
    name,
    slug: uniqueSlug(name, index),
  }));

  await prisma.newsTag.createMany({
    data: tagsData,
  });

  const tags = await prisma.newsTag.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${tags.length} news tags.`);

  return tags;
}

// ============================================================
// STEP 20 — NEWS
// ============================================================

async function seedNews() {
  console.log(`📰 Creating ${CONFIG.news} news articles...`);

  const newsData = Array.from({ length: CONFIG.news }, (_, index) => {
    const title = faker.lorem.sentence({
      min: 5,
      max: 12,
    });

    const status = randomElement([
      NewsStatus.PUBLISHED,
      NewsStatus.PUBLISHED,
      NewsStatus.PUBLISHED,
      NewsStatus.DRAFT,
      NewsStatus.ARCHIVED,
    ]);

    const createdAt = randomPastDate();

    return {
      title,
      slug: uniqueSlug(title, index),
      summary: faker.lorem.paragraph(),
      content: faker.lorem.paragraphs({
        min: 2,
        max: 6,
      }),
      thumbnail: "https://placehold.co/1200x630",
      category: randomElement(Object.values(NewsCategory)),
      status,
      viewsCount: randomInt(0, 10000),
      authorName: "Admin",
      publishedAt: status === NewsStatus.PUBLISHED ? createdAt : null,
      createdAt,
    };
  });

  const CHUNK_SIZE = 500;

  for (let i = 0; i < newsData.length; i += CHUNK_SIZE) {
    await prisma.news.createMany({
      data: newsData.slice(i, i + CHUNK_SIZE),
    });
  }

  const news = await prisma.news.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`✅ Created ${news.length} news articles.`);

  return news;
}

// ============================================================
// STEP 21 — NEWS TAG RELATIONS
// ============================================================

async function seedNewsTagRelations(news: any[], tags: any[]) {
  console.log("🏷️ Creating news-tag relationships...");

  const relations = [];

  for (const article of news) {
    const numberOfTags = randomInt(1, Math.min(5, tags.length));

    const selectedTags = faker.helpers.arrayElements(tags, numberOfTags);

    for (const tag of selectedTags) {
      relations.push({
        newsId: article.id,
        tagId: tag.id,
      });
    }
  }

  await prisma.newsTagRelation.createMany({
    data: relations,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${relations.length} news-tag relations.`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("");
  console.log("============================================================");
  console.log("🌱 LARGE DATABASE SEED");
  console.log("============================================================");
  console.log(`🎲 Random seed: ${RANDOM_SEED}`);
  console.log("");
  console.log("Target:");
  console.log(`   Users:              ${CONFIG.users}`);
  console.log(`   Exams:              ${CONFIG.exams}`);
  console.log(`   Histories/user:     ${CONFIG.examHistoriesPerUser}`);
  console.log(`   Decks:              ${CONFIG.decks}`);
  console.log(`   Flashcards:         ${CONFIG.flashcards}`);
  console.log(`   Forum posts:        ${CONFIG.forumPosts}`);
  console.log(`   Forum comments:     ${CONFIG.forumComments}`);
  console.log(`   Chat messages:      ${CONFIG.chatMessages}`);
  console.log(`   News:               ${CONFIG.news}`);
  console.log("============================================================");
  console.log("");

  // ----------------------------------------------------------
  // CLEAN
  // ----------------------------------------------------------

  await cleanDatabase();

  // ----------------------------------------------------------
  // ROLES
  // ----------------------------------------------------------

  const { adminRole, userRole } = await seedRoles();

  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  const { users } = await seedUsers(userRole.id, adminRole.id);

  // ----------------------------------------------------------
  // REAL QUESTIONS
  // ----------------------------------------------------------

  const { questions, questionJson } = await seedQuestions();

  const skillIds = await seedSkills();
  await seedQuestionSkills(questions, skillIds, questionJson);

  // ----------------------------------------------------------
  // EXAMS
  // ----------------------------------------------------------

  const { exams } = await seedExams(questions);

  // ----------------------------------------------------------
  // EXAM HISTORIES
  // ----------------------------------------------------------

  await seedExamHistories(users, exams, questions);

  // ----------------------------------------------------------
  // FLASHCARDS
  // ----------------------------------------------------------

  const decks = await seedDecks(users);

  const flashcards = await seedFlashcards(decks, users, questions);

  await seedFlashcardProgress(users, flashcards);

  await seedUserDeckProgress(users, decks);

  // ----------------------------------------------------------
  // FORUM
  // ----------------------------------------------------------

  const forumCategories = await seedForumCategories();

  const forumPosts = await seedForumPosts(forumCategories, users);

  const forumComments = await seedForumComments(forumPosts, users);

  await seedPostVotes(forumPosts, users);

  await seedCommentVotes(forumComments, users);

  await seedSavedPosts(forumPosts, users);

  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  const chatChannels = await seedChatChannels();

  await seedChatMessages(chatChannels, users);

  // ----------------------------------------------------------
  // NEWS
  // ----------------------------------------------------------

  const newsTags = await seedNewsTags();

  const news = await seedNews();

  await seedNewsTagRelations(news, newsTags);

  // ----------------------------------------------------------
  // COMPLETE
  // ----------------------------------------------------------

  console.log("");
  console.log("============================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED!");
  console.log("============================================================");

  console.log(`
Generated:
  👤 Users:                 ${users.length}
  📝 Exams:                 ${exams.length}
  🧩 Exam parts:            ${exams.length * 7}
  📚 Questions:             ${questions.length}
  📊 Exam histories:        ~${users.length * CONFIG.examHistoriesPerUser}
  🗂️ Decks:                 ${decks.length}
  🃏 Flashcards:            ${flashcards.length}
  💬 Forum categories:      ${forumCategories.length}
  📝 Forum posts:           ${forumPosts.length}
  💭 Forum comments:        ${forumComments.length}
  💬 Chat channels:         ${chatChannels.length}
  📰 News:                  ${news.length}
  🏷️ News tags:             ${newsTags.length}

  🔐 Admin:
     Email:    truongvuon235@gmail.com
     Password: vuongdeptrai

  👤 Generated users:
     Email:    user0001@example.com
     Password: password123
`);
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ SEEDING FAILED:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
