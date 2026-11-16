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
  "Thảo luận TOEIC",
  "Thảo luận IELTS",
  "Ngữ pháp tiếng Anh",
  "Từ vựng",
  "Luyện nghe",
  "Luyện đọc",
  "Kinh nghiệm học tập",
  "Trải nghiệm thi",
  "Tiếng Anh giao tiếp",
  "Cộng đồng",
];

const CHAT_CHANNEL_NAMES = [
  "Tiếng Anh mỗi ngày", "Ôn TOEIC", "Ôn IELTS", "Từ vựng", "Ngữ pháp",
  "Luyện nghe", "Luyện đọc", "Luyện nói", "Cùng học nhé", "Tiếng Anh giao tiếp",
  "Chuẩn bị đi thi", "Mới bắt đầu", "Trình độ nâng cao", "Tạo động lực",
  "Hỏi đáp", "Tán gẫu", "Thử thách tiếng Anh", "Mẹo học hay", "Trao đổi ngôn ngữ", "Góc cộng đồng",
];

const NEWS_TAG_NAMES = [
  "TOEIC", "IELTS", "Ngữ pháp", "Từ vựng", "Luyện nghe", "Luyện đọc",
  "Luyện nói", "Mẹo học tập", "Kinh nghiệm thi", "Học tiếng Anh", "Thông báo",
  "Cập nhật", "Cộng đồng", "Thực hành", "Mới bắt đầu", "Trung cấp", "Nâng cao",
  "Giáo dục", "Học tập", "Nổi bật", "Mẹo hay", "Tài liệu", "Thi cử", "Chuẩn bị thi",
  "Tiếng Anh mỗi ngày", "Thử thách", "Mở rộng từ vựng", "Mẹo ngữ pháp", "Mẹo luyện nghe",
  "Mẹo luyện đọc", "TOEIC Phần 1", "TOEIC Phần 2", "TOEIC Phần 3", "TOEIC Phần 4",
  "TOEIC Phần 5", "TOEIC Phần 6", "TOEIC Phần 7", "Tin tức", "Nền tảng",
];

// ============================================================
// HELPERS
// ============================================================

function randomElement<T>(items: T[]): T {
  return items[faker.number.int({ min: 0, max: items.length - 1 })];
}

function pick<T>(items: T[]): T {
  return randomElement(items);
}

const FORUM_POSTS = [
  { title: "Mất gốc nghe TOEIC thì nên bắt đầu từ đâu?", content: "Mình đang ôn TOEIC nhưng phần nghe gần như không bắt được ý. Mọi người thường luyện Part 1, 2 trước hay nghe hội thoại Part 3 luôn vậy? Nếu có lịch học dễ theo thì chia sẻ giúp mình với nhé." },
  { title: "Chia sẻ cách mình học từ vựng mà không nhanh quên", content: "Trước đây mình hay chép một danh sách dài rồi vài hôm sau quên gần hết. Gần đây mình học khoảng 10 từ mỗi ngày, tự đặt câu với từ mới và ôn lại sau 1, 3 rồi 7 ngày. Cách này hơi chậm nhưng nhớ lâu hơn. Mọi người có mẹo nào khác không?" },
  { title: "Thi thử lần đầu được 650, nên tập trung phần nào?", content: "Mình vừa làm bài thi thử và được 650 điểm. Part 5 sai khá nhiều, còn phần nghe thì mất tập trung ở đoạn hội thoại dài. Mục tiêu của mình là 750 trong ba tháng tới. Anh chị đã từng ở mức này có thể gợi ý thứ tự ôn tập không?" },
  { title: "Phân biệt giúp mình hiện tại hoàn thành và quá khứ đơn", content: "Mình hiểu là quá khứ đơn thường nói về việc đã kết thúc, còn hiện tại hoàn thành có liên hệ với hiện tại. Nhưng khi làm bài, đôi lúc không có mốc thời gian rõ ràng nên mình vẫn chọn nhầm. Có cách nào nhận biết nhanh qua ngữ cảnh không ạ?" },
  { title: "Tìm bạn học tiếng Anh buổi tối", content: "Mình thường rảnh khoảng 9 giờ tối các ngày trong tuần và muốn tìm một bạn cùng luyện nói 20–30 phút. Trình độ của mình khoảng A2–B1, chủ đề đơn giản như công việc, đồ ăn hay du lịch là được. Bạn nào muốn học cùng thì comment nhé!" },
  { title: "Luyện shadowing thế nào để không bị nản?", content: "Mình đang thử phương pháp shadowing nhưng cứ nghe câu dài là bị hụt hơi và phát âm không kịp. Mọi người thường chọn đoạn ngắn bao lâu, và có nên xem transcript ngay từ đầu không? Mình muốn tìm cách luyện đều mỗi ngày." },
  { title: "Kinh nghiệm chọn lịch thi IELTS lần đầu", content: "Mình dự định thi IELTS trong khoảng hai tháng nữa. Có nên đặt lịch thi trước để có động lực học không, hay chờ đến khi điểm thi thử ổn định rồi mới đăng ký? Mình hơi lo phần Speaking nên cũng muốn hỏi mọi người chuẩn bị trước ngày thi thế nào." },
  { title: "Một mẹo nhỏ giúp mình đỡ sợ Part 7", content: "Trước đây mình đọc từng câu từ đầu đến cuối nên thường không kịp giờ. Bây giờ mình đọc câu hỏi trước, gạch từ khóa rồi quay lại tìm thông tin trong bài. Tốc độ có cải thiện một chút. Nếu ai có cách quản lý thời gian tốt hơn thì cho mình xin kinh nghiệm nhé." },
  { title: "Mọi người ghi chú từ mới bằng app hay sổ tay?", content: "Mình đang phân vân giữa dùng ứng dụng flashcard và ghi từ mới vào sổ. App tiện ôn lại, còn viết tay thì mình thấy nhớ lâu hơn. Có bạn nào kết hợp cả hai không? Chia sẻ cách mọi người đang làm với." },
  { title: "Cuối tuần này cùng luyện đề nhé", content: "Mình định sáng Chủ nhật làm một đề TOEIC đủ thời gian, sau đó dành khoảng một tiếng chữa câu sai. Ai muốn tham gia thì mình có thể gửi đề và cùng trao đổi đáp án ở đây. Không cần điểm cao, quan trọng là duy trì thói quen." },
];

const FORUM_COMMENTS = [
  "Mình cũng từng gặp tình trạng này. Chia nhỏ mục tiêu mỗi ngày sẽ dễ duy trì hơn đó.",
  "Bạn thử nghe lại đoạn đó ở tốc độ bình thường sau khi đã xem transcript nhé, mình thấy khá hiệu quả.",
  "Cảm ơn bạn chia sẻ, mình sẽ thử áp dụng vào buổi học tối nay.",
  "Theo kinh nghiệm của mình thì nên làm bài ngắn trước, quen nhịp rồi hãy tăng độ khó.",
  "Mình đồng ý. Quan trọng là chữa kỹ câu sai chứ làm nhiều đề mà không xem lại thì hơi phí.",
  "Bạn có thể cho mình xin tên tài liệu đang dùng không? Mình cũng đang tìm tài liệu phù hợp.",
  "Nếu chưa chắc thì bạn thử làm một bài kiểm tra trình độ trước để biết phần nào cần ưu tiên nhé.",
  "Mình thường học khoảng 25 phút rồi nghỉ 5 phút, tập trung tốt hơn hẳn.",
  "Chúc bạn ôn tập thuận lợi nha, mục tiêu đó hoàn toàn có thể đạt được nếu học đều.",
  "Mình bổ sung thêm là nên ghi lại lỗi hay mắc để cuối tuần xem lại một lượt.",
];

const CHAT_MESSAGES = [
  "Chào mọi người, hôm nay mọi người đang ôn phần nào vậy?",
  "Mình vừa làm xong một đề nghe, Part 3 vẫn hơi khó theo kịp.",
  "Bạn thử đọc câu hỏi trước khi nghe nhé, mình thấy đỡ bị rối hơn.",
  "Cảm ơn nha, tối nay mình sẽ thử cách đó.",
  "Mọi người có tài liệu luyện phát âm dễ bắt đầu không ạ?",
  "Mình hay dùng đoạn hội thoại ngắn trên YouTube rồi nhại lại từng câu.",
  "Hôm nay học được 10 từ mới, cố gắng giữ streak thôi 😄",
  "Có ai muốn cùng làm đề vào sáng thứ Bảy không?",
  "Mình tham gia nhé, khoảng 9 giờ được không?",
  "Được đó, mình sẽ chuẩn bị một đề và gửi mọi người.",
  "Câu này mình chọn B nhưng đáp án lại là D, có bạn giải thích giúp mình không?",
  "Bạn gửi thêm ngữ cảnh với ảnh câu hỏi được không?",
  "Nghe podcast lúc đi xe buýt cũng là cách luyện khá ổn đó.",
  "Mình vừa thử rồi, tốc độ hơi nhanh nhưng chủ đề thú vị thật.",
  "Chúc cả nhà học tốt nhé, mình quay lại làm bài đây!",
  "Không sao đâu, sai câu nào mình ghi lại câu đó rồi ôn sau sẽ nhớ lâu hơn.",
  "Tuần này mọi người đặt mục tiêu học bao nhiêu buổi?",
  "Mình đặt mục tiêu 5 buổi, mỗi buổi chỉ cần nửa tiếng thôi.",
  "Cho mình hỏi mẹo phân biệt since với for với ạ?",
  "Since đi với mốc thời gian, còn for đi với khoảng thời gian bạn nhé.",
];

const NEWS_ARTICLES = [
  { title: "Cập nhật lịch thi TOEIC và những điều cần chuẩn bị", summary: "Một số lưu ý giúp thí sinh chủ động hơn khi đăng ký lịch thi và chuẩn bị giấy tờ cần thiết.", content: "Trước ngày thi, thí sinh nên kiểm tra kỹ thông tin đăng ký, địa điểm và thời gian có mặt. Hãy chuẩn bị giấy tờ tùy thân đúng yêu cầu, ngủ đủ giấc và đến sớm để tránh cập rập.\n\nTrong quá trình ôn tập, nên làm đề có bấm giờ để quen với nhịp bài thi. Sau mỗi lần luyện, hãy dành thời gian xem lại câu sai và ghi chú những dạng câu thường gây nhầm lẫn." },
  { title: "Gợi ý xây dựng thói quen học tiếng Anh mỗi ngày", summary: "Một lịch học ngắn và đều đặn thường dễ duy trì hơn những buổi học kéo dài nhưng thất thường.", content: "Người học có thể bắt đầu bằng một mục tiêu vừa sức, chẳng hạn 15 phút nghe và 10 phút ôn từ mới mỗi ngày. Khi thói quen đã ổn định, hãy tăng dần thời lượng hoặc bổ sung kỹ năng còn yếu.\n\nViệc ghi lại tiến độ theo tuần giúp bạn nhìn thấy sự cải thiện và điều chỉnh kế hoạch phù hợp. Đừng quá lo nếu có ngày học chưa tốt; hãy quay lại lịch học ở ngày tiếp theo." },
  { title: "Mẹo đọc nhanh hơn trong phần Reading", summary: "Đọc câu hỏi trước và xác định từ khóa giúp bạn tìm thông tin hiệu quả hơn trong bài đọc dài.", content: "Ở những bài đọc dài, thí sinh không nhất thiết phải dịch từng câu ngay từ đầu. Hãy xem câu hỏi, gạch chân tên riêng, con số hoặc cụm từ quan trọng, sau đó tìm đoạn có thông tin liên quan.\n\nSau khi xác định được vị trí, đọc kỹ phần xung quanh để tránh chọn đáp án chỉ vì thấy từ giống nhau. Luyện tập thường xuyên với thời gian giới hạn sẽ giúp cải thiện tốc độ mà vẫn giữ độ chính xác." },
  { title: "Cách ôn từ vựng để nhớ lâu và dùng được trong câu", summary: "Học từ mới trong ngữ cảnh và ôn lại theo khoảng thời gian giúp tăng khả năng ghi nhớ.", content: "Thay vì chỉ ghi nghĩa tiếng Việt, hãy học thêm cách phát âm, từ loại và một câu ví dụ ngắn. Khi gặp từ trong bài đọc hoặc bài nghe, bạn sẽ dễ nhận ra cách từ đó được sử dụng hơn.\n\nCó thể ôn lại từ mới sau một ngày, vài ngày rồi một tuần. Nếu vẫn thường xuyên quên, hãy thử tự đặt một câu liên quan đến công việc hoặc cuộc sống hàng ngày." },
  { title: "Luyện nghe tiếng Anh: bắt đầu từ đoạn ngắn", summary: "Nghe chủ động với đoạn hội thoại vừa sức giúp người học nhận ra từ nối và cách phát âm tự nhiên.", content: "Người mới luyện nghe có thể chọn đoạn hội thoại từ một đến hai phút. Lượt đầu nghe để nắm ý chung, lượt sau ghi lại những cụm từ nghe được, rồi kiểm tra với phụ đề hoặc transcript.\n\nSau khi hiểu nội dung, hãy nghe lại và chú ý cách người nói nối âm, nhấn trọng âm. Không cần hiểu mọi từ ngay lập tức; việc nghe đều đặn sẽ giúp tai quen dần với tốc độ tự nhiên." },
  { title: "Thông báo: cộng đồng mở buổi học nhóm trực tuyến", summary: "Thành viên có thể cùng luyện đề, trao đổi câu hỏi và chia sẻ cách học trong buổi sinh hoạt cuối tuần.", content: "Cộng đồng sẽ tổ chức buổi học nhóm trực tuyến vào sáng thứ Bảy tuần này. Nội dung gồm một phần luyện đề ngắn và thời gian cùng chữa những câu còn chưa rõ.\n\nThành viên tham gia có thể chuẩn bị sẵn giấy bút và ghi lại câu hỏi muốn trao đổi. Buổi học phù hợp với nhiều trình độ; mọi người cùng học trong tinh thần thoải mái và hỗ trợ lẫn nhau." },
  { title: "Chuẩn bị cho phần Speaking với câu trả lời mạch lạc", summary: "Một câu trả lời rõ ý, có ví dụ cụ thể thường hiệu quả hơn việc cố dùng thật nhiều từ khó.", content: "Khi luyện Speaking, hãy thử trả lời theo ba bước: nêu ý chính, giải thích lý do và đưa ra một ví dụ ngắn. Cấu trúc đơn giản giúp câu trả lời mạch lạc và hạn chế việc dừng quá lâu để tìm ý.\n\nBạn có thể ghi âm phần nói của mình rồi nghe lại để phát hiện lỗi phát âm hoặc chỗ diễn đạt chưa tự nhiên. Luyện tập với nhiều chủ đề quen thuộc sẽ giúp bạn tự tin hơn." },
  { title: "Sử dụng bài thi thử để theo dõi tiến độ học tập", summary: "Kết quả thi thử hữu ích nhất khi đi kèm với việc phân tích lỗi và điều chỉnh kế hoạch ôn tập.", content: "Một bài thi thử giúp bạn làm quen với thời gian và nhận ra kỹ năng nào cần cải thiện. Sau khi hoàn thành, hãy phân loại câu sai theo nguyên nhân như thiếu từ vựng, đọc nhầm câu hỏi hay mất tập trung khi nghe.\n\nDựa vào đó, bạn có thể dành thêm thời gian cho phần yếu thay vì chỉ tiếp tục làm đề mới. Nên so sánh kết quả theo từng giai đoạn để theo dõi tiến bộ thực tế." },
];

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
    description: `Nơi mọi người cùng trao đổi về ${name.toLowerCase()} và chia sẻ kinh nghiệm học tập.`,
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

    const sample = pick(FORUM_POSTS);
    const title = sample.title;

    const upvotes = randomInt(0, 100);
    const downvotes = randomInt(0, 20);

    return {
      title,
      slug: uniqueSlug(title, index),
      content: sample.content,
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
      content: pick(FORUM_COMMENTS),
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
      content: pick(FORUM_COMMENTS),
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
      description: `Cùng trò chuyện, hỏi đáp và chia sẻ về ${name.toLowerCase()}.`,
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
      content: pick(CHAT_MESSAGES),
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
      content: pick(CHAT_MESSAGES),
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
    const article = NEWS_ARTICLES[index % NEWS_ARTICLES.length];
    const title = article.title;

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
      summary: article.summary,
      content: article.content,
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
