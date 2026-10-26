import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  classifyFields,
  fieldBatches,
  vertexFieldConfig,
  type FieldCandidate,
} from "./vertex-fields";

const budgetKeys = ["field-search:hour", "field-search:day"] as const;
// Shared across clients and hosting instances. Reservations are committed BEFORE inference.
export async function persistedFieldClassifier(
  query: string,
  candidates: FieldCandidate[],
  env: Record<string, string | undefined> = process.env,
  classify = classifyFields,
) {
  const config = vertexFieldConfig(env);
  const calls = fieldBatches(query, candidates).length;
  if (!calls) return [];
  const key = createHash("sha256")
    .update(JSON.stringify(["v2", config, query, candidates]))
    .digest("hex");
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const now = new Date();
    const claim = await db().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('field-search:budget'))`;
      const cached = await tx.fieldSearchCache.findUnique({ where: { key } });
      if (cached && cached.expiresAt > now) {
        if (cached.state === "semantic") return { kind: "cached" as const, ids: cached.ids };
        if (cached.state === "failed") return { kind: "refused" as const };
        if (cached.leaseUntil && cached.leaseUntil > now) return { kind: "waiting" as const };
      }
      await tx.fieldSearchCache.deleteMany({
        where: {
          expiresAt: { lte: now },
          OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
        },
      });
      if ((await tx.fieldSearchCache.count()) >= 200) return { kind: "refused" as const };
      const windows = [3_600_000, 86_400_000];
      const limits = [12, 60];
      const counters = await tx.rateLimit.findMany({ where: { key: { in: [...budgetKeys] } } });
      const periods = windows.map((window) => BigInt(Math.floor(now.getTime() / window) * window));
      const used = budgetKeys.map((key, i) => {
        const counter = counters.find((row) => row.key === key);
        return counter?.lastRequest === periods[i] ? counter.count : 0;
      });
      if (used.some((value, i) => value + calls > limits[i])) return { kind: "refused" as const };
      for (const [i, key] of budgetKeys.entries())
        await tx.rateLimit.upsert({
          where: { key },
          create: { key, count: used[i] + calls, lastRequest: periods[i] },
          update: { count: used[i] + calls, lastRequest: periods[i] },
        });
      const token = randomUUID();
      const data = {
        state: "pending",
        ids: [] as string[],
        expiresAt: new Date(now.getTime() + 25_000),
        leaseUntil: new Date(now.getTime() + 25_000),
        leaseToken: token,
      };
      await tx.fieldSearchCache.upsert({ where: { key }, create: { key, ...data }, update: data });
      return { kind: "owned" as const, token };
    });
    if (claim.kind === "cached") return claim.ids;
    if (claim.kind === "refused") throw new Error("Subject matching is temporarily unavailable.");
    if (claim.kind === "waiting") {
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }
    try {
      const ids = await classify(query, candidates, env, Math.min(15_000, deadline - Date.now()));
      const saved = await db().fieldSearchCache.updateMany({
        where: { key, leaseToken: claim.token },
        data: {
          state: "semantic",
          ids,
          expiresAt: new Date(Date.now() + 3_600_000),
          leaseUntil: null,
          leaseToken: null,
        },
      });
      if (saved.count !== 1) throw new Error("Subject matching result expired.");
      return ids;
    } catch {
      await db().fieldSearchCache.updateMany({
        where: { key, leaseToken: claim.token },
        data: {
          state: "failed",
          expiresAt: new Date(Date.now() + 30_000),
          leaseUntil: null,
          leaseToken: null,
        },
      });
      throw new Error("Subject matching is temporarily unavailable.");
    }
  }
  throw new Error("Subject matching timed out.");
}
