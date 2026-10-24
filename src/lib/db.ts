import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { SetupError } from "./env";
const globalDb = globalThis as unknown as { grantpathDb?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL)
    throw new SetupError(
      "GrantPath needs DATABASE_URL. Copy .env.example and configure PostgreSQL.",
    );
  if (!globalDb.grantpathDb)
    globalDb.grantpathDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 }),
    });
  return globalDb.grantpathDb;
}
