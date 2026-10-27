import { db } from "@/lib/db";
import { boundedFetchUrl, robotsPolicy } from "@/server/monitoring/network";
import { reserveHost } from "@/server/monitoring/worker";
import { directoryDefinitions } from "./registry";
import { allowedDiscoveryUrl } from "./urls";
import { processDirectoryHtml, processDetailHtml } from "./service";
import type { DirectoryDefinition } from "./types";
export async function fetchDiscoveryPage(
  raw: string,
  definition: DirectoryDefinition,
  kind: "directory" | "detail",
) {
  const url = allowedDiscoveryUrl(raw, definition, kind);
  await reserveHost(url.hostname, 20);
  const robots = await boundedFetchUrl(
    allowedDiscoveryUrl(`${url.origin}/robots.txt`, definition, "robots"),
    true,
  );
  if (
    ![200, 404, 410].includes(robots.status) ||
    (robots.status === 200 && /<html|<!doctype/i.test(robots.text))
  )
    throw new Error(`ROBOTS_UNAVAILABLE:${robots.status}`);
  const policy =
    robots.status === 200
      ? robotsPolicy(robots.text, url.pathname + url.search)
      : { allowed: true, crawlDelaySeconds: 20 };
  if (!policy.allowed) throw new Error("ROBOTS_DISALLOWED");
  if (policy.crawlDelaySeconds > 60) throw new Error("UNSUPPORTED_CRAWL_DELAY");
  await reserveHost(url.hostname, policy.crawlDelaySeconds);
  // Redirects are rejected by the shared downloader. Canonical changes require policy review.
  const page = await boundedFetchUrl(url);
  if (page.status !== 200) throw new Error(`SOURCE_HTTP:${page.status}`);
  return page;
}
export async function checkDirectory(id: string) {
  if (id === "controlled-release") return { id, state: "controlled_snapshots_only" };
  const token = crypto.randomUUID(),
    now = new Date();
  const claimed = await db().discoveryDirectory.updateMany({
    where: { id, enabled: true, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { lastAttemptAt: now, lockedUntil: new Date(now.getTime() + 540000), leaseToken: token },
  });
  if (!claimed.count) return { id, state: "paused_or_busy" };
  const schedule = await db().discoveryDirectory.findUniqueOrThrow({ where: { id } });
  const definition = directoryDefinitions[id];
  if (!definition) throw new Error("UNSUPPORTED_DIRECTORY");
  const queue = [definition.url],
    visited = new Set<string>();
  let discovered = 0;
  try {
    while (queue.length && visited.size < 3 && discovered < 100) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      const owner = await db().discoveryDirectory.findUniqueOrThrow({ where: { id } });
      if (!owner.enabled || owner.leaseToken !== token)
        throw new Error("SOURCE_PAUSED_OR_LEASE_LOST");
      visited.add(url);
      const page = await fetchDiscoveryPage(url, definition, "directory");
      const result = await processDirectoryHtml(id, page.text, url, 100 - discovered);
      discovered += result.ids.length;
      queue.push(...result.next.filter((next) => !visited.has(next)));
    }
    await db().discoveryDirectory.updateMany({
      where: { id, leaseToken: token },
      data: {
        health: "healthy",
        lastSuccessAt: new Date(),
        nextCheckAt: new Date(Date.now() + schedule.cadenceHours * 3600000),
        lockedUntil: null,
        leaseToken: null,
      },
    });
    return { id, state: "success", pages: visited.size, discovered };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 600) : "DISCOVERY_FAILED";
    await db().$transaction(async (tx) => {
      const owner = await tx.discoveryDirectory.updateMany({
        where: { id, leaseToken: token },
        data: {
          health: "unavailable",
          nextCheckAt: new Date(Date.now() + 3600000),
          lockedUntil: null,
          leaseToken: null,
        },
      });
      if (owner.count)
        await tx.directoryCheck.create({
          data: {
            directoryId: id,
            url: [...visited].at(-1) || definition.url,
            state: "failed",
            error: message,
          },
        });
    });
    return { id, state: "failed", error: message };
  }
}
export async function checkCandidate(id: string) {
  const token = crypto.randomUUID(),
    now = new Date();
  const candidate = await db().discoveredCandidate.findUniqueOrThrow({
    where: { id },
    include: { directory: true },
  });
  if (candidate.directoryId === "controlled-release")
    return { id, state: "controlled_snapshots_only" };
  if (!candidate.directory.enabled) return { id, state: "paused" };
  const claimed = await db().discoveredCandidate.updateMany({
    where: { id, attempts: { lt: 5 }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: {
      state: "fetching",
      attempts: { increment: 1 },
      lockedUntil: new Date(now.getTime() + 180000),
      leaseToken: token,
    },
  });
  if (!claimed.count) return { id, state: "busy_or_exhausted" };
  try {
    const page = await fetchDiscoveryPage(
      candidate.canonicalUrl,
      directoryDefinitions[candidate.directoryId],
      "detail",
    );
    const mapping = directoryDefinitions[candidate.directoryId].mappings.find(
      (m) => m.url === candidate.canonicalUrl,
    );
    const supportPages: Record<string, string> = {};
    for (const url of (mapping?.supportPages || []).slice(0, 3)) {
      const support = await fetchDiscoveryPage(
        url,
        directoryDefinitions[candidate.directoryId],
        "detail",
      );
      supportPages[url] = support.text;
    }
    const decision = await processDetailHtml(id, page.text, {
      leaseToken: token,
      supportPages,
      startedAt: now,
    });
    await db().discoveredCandidate.updateMany({
      where: { id, state: "published" },
      data: { attempts: 0 },
    });
    return { id, state: decision.decision, reasons: decision.reasonCodes };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 600) : "DETAIL_FAILED";
    await db().discoveredCandidate.updateMany({
      where: { id, leaseToken: token },
      data: {
        state: "failed",
        error: message,
        lockedUntil: null,
        leaseToken: null,
        nextAttemptAt: new Date(Date.now() + Math.min(24, 2 ** (candidate.attempts + 1)) * 3600000),
      },
    });
    return { id, state: "failed", error: message };
  }
}
export async function discoverBatch(limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 6) throw new Error("Run quota must be1–6.");
  const now = new Date();
  const directories = await db().discoveryDirectory.findMany({
    where: {
      enabled: true,
      id: { not: "controlled-release" },
      nextCheckAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    orderBy: { nextCheckAt: "asc" },
    take: limit,
  });
  const results = [];
  for (const directory of directories) results.push(await checkDirectory(directory.id));
  return results;
}
export async function detailBatch(limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 6) throw new Error("Run quota must be1–6.");
  const now = new Date();
  const candidates = await db().discoveredCandidate.findMany({
    where: {
      directory: { enabled: true, id: { not: "controlled-release" } },
      attempts: { lt: 5 },
      state: { in: ["pending", "published", "failed", "fetching"] },
      nextAttemptAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });
  const results = [];
  for (const candidate of candidates) results.push(await checkCandidate(candidate.id));
  return results;
}
