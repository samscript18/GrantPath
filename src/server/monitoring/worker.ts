import { db } from "@/lib/db";
import { boundedFetch, robotsPolicy, validateSourceUrl } from "./network";
import { processSourceHtml, recordSourceFailure } from "./index";
async function reserveHost(host: string, delaySeconds: number) {
  const now = Date.now();
  const delay = Math.max(20, delaySeconds) * 1000;
  const key = `source-host:${host}`;
  const id = crypto.randomUUID();
  const result = await db().$queryRaw<
    { lastRequest: bigint }[]
  >`INSERT INTO "RateLimit" (id, key, count, "lastRequest") VALUES (${id}, ${key}, 0, ${BigInt(now + delay)}) ON CONFLICT (key) DO UPDATE SET "lastRequest" = GREATEST("RateLimit"."lastRequest", ${BigInt(now)}) + ${BigInt(delay)} RETURNING "lastRequest"`;
  const wait = Number(result[0].lastRequest) - delay - now;
  if (wait > 60000)
    throw new Error("Host crawl-delay reservation exceeds this bounded check. Retry later.");
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}
export async function claimSourceCheck(sourceId: string, now = new Date()) {
  const token = crypto.randomUUID();
  return db().$transaction(async (tx) => {
    const claimed = await tx.source.updateMany({
      where: { id: sourceId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      data: {
        lockedUntil: new Date(now.getTime() + 180000),
        leaseToken: token,
        lastAttemptAt: now,
      },
    });
    if (!claimed.count) return null;
    await tx.observation.updateMany({
      where: { sourceId, state: "fetching" },
      data: {
        state: "failed",
        error:
          "Source worker was interrupted and its lease expired. A new bounded attempt has started.",
      },
    });
    const observation = await tx.observation.create({
      data: { sourceId, state: "fetching", attemptedAt: now },
    });
    return { token, observationId: observation.id };
  });
}
export async function checkSource(sourceId: string, manual = false) {
  const source = await db().source.findUniqueOrThrow({ where: { id: sourceId } });
  if (!source.enabled && !source.requestedAt && !manual) return { state: "paused" };
  const claimed = await claimSourceCheck(sourceId);
  if (!claimed) return { state: "busy" };
  const { token, observationId } = claimed;
  let httpStatus: number | undefined;
  try {
    const url = validateSourceUrl(source.url, source.adapter);
    await reserveHost(url.hostname, 20);
    const robots = await boundedFetch(`${url.origin}/robots.txt`, source.adapter, true);
    httpStatus = robots.status;
    if (robots.status !== 404 && robots.status !== 410 && robots.status !== 200)
      throw new Error(`Robots policy unavailable (${robots.status}); source check deferred.`);
    if (robots.status === 200 && /<html|<!doctype/i.test(robots.text))
      throw new Error(
        "Robots endpoint returned HTML; access policy is uncertain and no source page was fetched.",
      );
    const policy =
      robots.status === 200
        ? robotsPolicy(robots.text, url.pathname)
        : { allowed: true, crawlDelaySeconds: 20 };
    if (!policy.allowed)
      throw new Error("robots.txt disallows this adapter path. No page was fetched.");
    if (policy.crawlDelaySeconds > 60)
      throw new Error("Provider crawl delay exceeds this worker’s supported bounded interval.");
    await reserveHost(url.hostname, policy.crawlDelaySeconds);
    const page = await boundedFetch(source.url, source.adapter);
    httpStatus = page.status;
    if (page.status !== 200)
      throw new Error(`Source retrieval failed (${page.status}). Accepted information retained.`);
    return await processSourceHtml(sourceId, page.text, { leaseToken: token, observationId });
  } catch (e) {
    return recordSourceFailure(
      sourceId,
      e instanceof Error ? e.message : "Source retrieval failed",
      httpStatus,
      token,
      new Date(),
      observationId,
    );
  }
}
export async function ingestBatch(limit = 6) {
  const bounded = Math.max(1, Math.min(6, limit));
  const now = new Date();
  const sources = await db().source.findMany({
    where: {
      OR: [{ enabled: true, nextCheckAt: { lte: now } }, { requestedAt: { not: null } }],
      AND: [{ OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }],
    },
    orderBy: [{ requestedAt: "desc" }, { nextCheckAt: "asc" }],
    take: bounded,
  });
  const results = [];
  for (const source of sources)
    results.push({ sourceId: source.id, ...(await checkSource(source.id)) });
  return results;
}
