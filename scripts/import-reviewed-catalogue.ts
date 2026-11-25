import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { db } from "../src/lib/db";
import {
  catalogueBundleSchema,
  planTransferRecord,
  importTransferRecord,
  validateTransferRecord,
} from "../src/server/scholarships/catalogue-transfer";
import { semanticHash } from "../src/server/scholarships/publish";
const args = process.argv.slice(2),
  flag = (key: string) => args.find((a) => a.startsWith(key + "="))?.slice(key.length + 1);
const path = flag("--manifest");
if (!path || !process.env.DATABASE_URL)
  throw Error("Explicit manifest and target DATABASE_URL required");
const raw = await readFile(path, "utf8");
if (raw.length > 100_000_000) throw Error("Manifest bound exceeded");
const bundle = catalogueBundleSchema.parse(JSON.parse(raw));
const sha256 = semanticHash(bundle);
const url = new URL(process.env.DATABASE_URL);
const target = createHash("sha256")
  .update(url.hostname + url.pathname)
  .digest("hex");
const apply = args.includes("--apply");
if (apply && (flag("--confirm-sha") !== sha256 || flag("--expect-target") !== target))
  throw Error("Apply requires the exact manifest and target fingerprints from a successful plan");
const results: Record<string, unknown>[] = [];
try {
  // Complete preflight before any catalogue mutation. Per-record transactions
  // recheck production edits and lock identity again during resumable apply.
  const conflicts: Record<string, string>[] = [];
  const programmes = new Set(
    (
      await db().programme.findMany({
        where: { slug: { in: bundle.records.map((r) => r.programme.slug) } },
        select: { slug: true },
      })
    ).map((p) => p.slug),
  );
  const slugs = new Set(
    (
      await db().scholarship.findMany({
        where: { slug: { in: bundle.records.map((r) => r.slug) } },
        select: { slug: true },
      })
    ).map((s) => s.slug),
  );
  for (const record of bundle.records) {
    try {
      validateTransferRecord(record);
      const plan =
        programmes.has(record.programme.slug) || slugs.has(record.slug)
          ? await planTransferRecord(db(), record)
          : { kind: "new" };
      results.push({ sourceId: record.sourceId, slug: record.slug, kind: plan.kind });
    } catch (error) {
      conflicts.push({
        slug: record.slug,
        reason: error instanceof Error ? error.message : "TRANSFER_ERROR",
      });
    }
  }
  const plan = {
    checkedAt: new Date().toISOString(),
    sha256,
    target,
    records: bundle.records.length,
    counts: Object.fromEntries(
      ["new", "updated", "unchanged"].map((k) => [k, results.filter((r) => r.kind === k).length]),
    ),
    conflicts,
  };
  await writeFile(".local/release/import-plan.json", JSON.stringify(plan, null, 2));
  console.log(JSON.stringify(plan));
  if (conflicts.length) throw Error("Transfer conflicts must be resolved before apply");
  if (apply) {
    const applied = [];
    for (let offset = 0; offset < bundle.records.length; offset += 3) {
      const batch = await Promise.allSettled(
        bundle.records
          .slice(offset, offset + 3)
          .map(async (record) => ({
            sourceId: record.sourceId,
            ...(await db().$transaction((tx) => importTransferRecord(tx, record), {
              timeout: 60000,
            })),
          })),
      );
      for (const result of batch) if (result.status === "fulfilled") applied.push(result.value);
      const failures = batch.filter((result) => result.status === "rejected");
      if (offset % 24 === 0 || failures.length || offset + 3 >= bundle.records.length) {
        await writeFile(
          ".local/release/import-progress.json",
          JSON.stringify({ sha256, target, applied }, null, 2),
        );
        console.log(JSON.stringify({ applied: applied.length }));
      }
      if (failures.length)
        throw new AggregateError(
          failures.map((f) => f.reason),
          "Catalogue batch failed; completed transactions are resumable",
        );
    }
    await writeFile(
      ".local/release/import-result.json",
      JSON.stringify({ completedAt: new Date().toISOString(), sha256, target, applied }, null, 2),
    );
    console.log(JSON.stringify({ completed: applied.length }));
  }
} finally {
  await db().$disconnect();
}
