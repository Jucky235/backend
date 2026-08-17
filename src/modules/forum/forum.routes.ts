import { Router } from "express";
import { ForumController } from "./forum.controller";
import { authenticateJWT } from "../../middleware/auth";

const router = Router();
const controller = new ForumController();

// ==========================================
// --- PUBLIC / OPTIONAL AUTH ROUTES ---
// ==========================================

// Lấy danh sách danh mục forum
router.get("/categories", (req, res) => controller.getAllCategories(req, res));

// Lấy danh sách bài viết (Có phân trang, search, filter category & sort)
router.get("/posts", (req, res) => controller.getAllPosts(req, res));

// Lấy chi tiết 1 bài viết kèm bình luận (Truyền token nếu muốn lấy trạng thái vote của user)
router.get("/posts/:id", (req, res) => controller.getPostById(req, res));

// ==========================================
// --- AUTHENTICATED ROUTES ---
// ==========================================

// Tạo bài viết mới
router.post("/posts", authenticateJWT, (req, res) =>
  controller.createPost(req, res),
);

// Vote / Downvote bài viết
router.post("/posts/:id/vote", authenticateJWT, (req, res) =>
  controller.votePost(req, res),
);

// Bình luận hoặc trả lời bình luận trong bài viết
router.post("/posts/:id/comments", authenticateJWT, (req, res) =>
  controller.createComment(req, res),
);

// Bookmark / Hủy bookmark bài viết
router.post("/posts/:id/save", authenticateJWT, (req, res) =>
  controller.toggleSavePost(req, res),
);

// Xóa bài viết
router.delete("/posts/:id", authenticateJWT, (req, res) =>
  controller.deletePost(req, res),
);

export default router;
