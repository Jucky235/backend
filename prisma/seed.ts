import { AuthProvider, Gender } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/db"; // Pulls your Neon-configured adapter

async function main() {
  console.log("🌱 Starting user database seeding...");

  // 1. Clear old user data to keep environment clean during testing
  await prisma.user.deleteMany({});
  console.log("🧹 Cleaned existing user records.");

  // 2. Hash a plain-text password securely
  const plainPassword = "vuongdeptrai"; // You will use this to test login later
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  // 3. Create your standalone test user with the real hash
  const testUser = await prisma.user.create({
    data: {
      email: "truongvuon235@gmail.com",
      password: hashedPassword,
      name: "Truong Quoc Vuong",
      phoneNumber: "0912345678",
      gender: Gender.MALE,
      provider: AuthProvider.EMAIL,
      refreshTokens: [],
    },
  });

  console.log(
    `👤 Successfully seeded user: ${testUser.name} (${testUser.email})`,
  );
  console.log(`🔑 Plain Password for testing: ${plainPassword}`);
  console.log(`🔒 Hashed Password stored: ${testUser.password}`);
  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
