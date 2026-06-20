import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

console.log("Loading db.ts...");

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.split("&channel_binding=")[0];

console.log(`DATABASE_URL = ${cleanUrl}`);

// FIX: Pass the connection string directly inside an object to PrismaNeon
const adapter = new PrismaNeon({ connectionString: cleanUrl });
console.log("Adapter created natively");

export const prisma = new PrismaClient({ adapter });
console.log("Prisma client exported");
