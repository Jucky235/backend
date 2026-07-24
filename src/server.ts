import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import examRoutes from "./modules/exam/exam.routes";
import flashcardRoutes from "./modules/flashcard/flashcard.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount Modular Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/flashcards", flashcardRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Modular server running on http://localhost:${PORT}`);
});
