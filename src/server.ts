import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import examRoutes from "./modules/exam/exam.routes";
import flashcardRoutes from "./modules/flashcard/flashcard.routes";
import newRoutes from "./modules/new/new.routes";
import questionRoutes from "./modules/questions/question.routes";
import channelRoutes from "./modules/channel/channel.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount Modular Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/news", newRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/channels", channelRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Modular server running on http://localhost:${PORT}`);
});
