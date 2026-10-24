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
export async function checkSource(sourceId: string, manual = false) {
  const source = await db().source.findUniqueOrThrow({ where: { id: sourceId } });
  if (!source.enabled && !source.requestedAt && !manual) return { state: "paused" };
  const now = new Date();
  const token = crypto.randomUUID();
  const claimed = await db().source.updateMany({
    where: { id: sourceId, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lockedUntil: new Date(now.getTime() + 180000), leaseToken: token, lastAttemptAt: now },
  });
  if (!claimed.count) return { state: "busy" };
  try {
    const url = validateSourceUrl(source.url, source.adapter);
    await reserveHost(url.hostname, 20);
    const robots = await boundedFetch(`${url.origin}/robots.txt`, source.adapter, true);
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
    if (page.status !== 200)
      throw new Error(`Source retrieval failed (${page.status}). Accepted information retained.`);
    return await processSourceHtml(sourceId, page.text, { leaseToken: token });
  } catch (e) {
    return recordSourceFailure(
      sourceId,
      e instanceof Error ? e.message : "Source retrieval failed",
      undefined,
      token,
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
