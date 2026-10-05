import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import examRoutes from "./modules/exam/exam.routes";
import flashcardRoutes from "./modules/flashcard/flashcard.routes";
import newRoutes from "./modules/new/new.routes";
import questionRoutes from "./modules/questions/question.routes";
import channelRoutes from "./modules/channel/channel.routes";
import forumRoutes from "./modules/forum/forum.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import dailyTestRoutes from "./modules/daily-test/daily-test.routes";
import roadmapRoutes from "./modules/roadmap/roadmap.routes";
import navigationRoutes from "./modules/navigation/navigation.routes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Mount Modular Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/news", newRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/daily-test", dailyTestRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/navigation", navigationRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Modular server running on port ${PORT}`);
});
