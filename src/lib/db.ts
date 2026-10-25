import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { SetupError } from "./env";
const globalDb = globalThis as unknown as { grantpathDb?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL)
    throw new SetupError(
      "GrantPath needs DATABASE_URL. Copy .env.example and configure PostgreSQL.",
    );
  if (!globalDb.grantpathDb) {
    const connectionUrl = new URL(process.env.DATABASE_URL);
    // Preserve pg 8's verified TLS behaviour when provider URLs use an alias.
    // Leave explicit libpq compatibility and local non-TLS URLs unchanged.
    if (
      connectionUrl.searchParams.get("uselibpqcompat") !== "true" &&
      ["prefer", "require", "verify-ca"].includes(connectionUrl.searchParams.get("sslmode") ?? "")
    ) {
      connectionUrl.searchParams.set("sslmode", "verify-full");
    }
    globalDb.grantpathDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: connectionUrl.toString(),
        max: 5,
        connectionTimeoutMillis: 15000,
        query_timeout: 20000,
      }),
      // Preserve atomic publication on a remote database with bounded latency.
      transactionOptions: { maxWait: 10000, timeout: 20000 },
    });
  }
  return globalDb.grantpathDb;
}
