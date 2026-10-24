import { db } from "@/lib/db";
export async function mutationQuota(userId: string, scope: string, now = Date.now()) {
  const key = `mutation:${scope}:${userId}`;
  const id = crypto.randomUUID();
  const rows = await db().$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" (id, key, count, "lastRequest") VALUES (${id}, ${key}, 1, ${BigInt(now)}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - 60000)} THEN 1 ELSE "RateLimit".count + 1 END, "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - 60000)} THEN ${BigInt(now)} ELSE "RateLimit"."lastRequest" END RETURNING count`;
  return rows[0].count <= 60;
}
