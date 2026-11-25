import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import {
  catalogueBundleSchema,
  validateTransferRecord,
} from "../src/server/scholarships/catalogue-transfer";
import { semanticHash } from "../src/server/scholarships/publish";
if (process.env.DATABASE_URL !== "postgresql://mac@127.0.0.1:55434/grantpath_growth_test")
  throw Error("Export requires the exact isolated development catalogue");
try {
  const rows = await db().scholarship.findMany({
    where: { published: true },
    orderBy: { slug: "asc" },
    include: {
      programme: { include: { provider: true } },
      versions: { orderBy: { number: "asc" } },
    },
  });
  const bundle = catalogueBundleSchema.parse({
    format: "grantpath-reviewed-catalogue-1",
    origin: "isolated-discovery-expansion",
    exportedAt: new Date().toISOString(),
    records: rows.map((row) => ({
      sourceId: row.id,
      slug: row.slug,
      cycle: row.cycle,
      provider: {
        slug: row.programme.provider.slug,
        name: row.programme.provider.name,
        url: row.programme.provider.url,
        countryCode: row.programme.provider.countryCode,
      },
      programme: { slug: row.programme.slug, name: row.programme.name },
      versions: row.versions.map((v) => ({
        number: v.number,
        data: v.data,
        semanticHash: v.semanticHash,
        actorId: v.actorId,
        reason: v.reason,
        createdAt: v.createdAt.toISOString(),
      })),
    })),
  });
  bundle.records.forEach(validateTransferRecord);
  if (bundle.records.length !== 1126)
    throw Error("Reviewed release requires exactly 1,126 records");
  await writeFile(".local/release/catalogue.json", JSON.stringify(bundle), { mode: 0o600 });
  console.log(
    JSON.stringify({
      records: bundle.records.length,
      versions: bundle.records.reduce((n, r) => n + r.versions.length, 0),
      sha256: semanticHash(bundle),
    }),
  );
} finally {
  await db().$disconnect();
}
