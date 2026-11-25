import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { publicationSchema, scholarshipDataSchema } from "./schema";
import { semanticHash, publishScholarshipTx } from "./publish";

const versionSchema = z.object({
  number: z.number().int().positive(),
  data: z.record(z.string(), z.unknown()),
  semanticHash: z.string().regex(/^[a-f0-9]{64}$/),
  actorId: z.string(),
  reason: z.string(),
  createdAt: z.iso.datetime(),
});
export const transferRecordSchema = z.object({
  sourceId: z.string(),
  slug: z.string(),
  cycle: z.string(),
  provider: z.object({
    slug: z.string(),
    name: z.string(),
    url: z.url(),
    countryCode: z.string().nullable(),
  }),
  programme: z.object({ slug: z.string(), name: z.string() }),
  versions: z.array(versionSchema).min(1).max(200),
});
export const catalogueBundleSchema = z.object({
  format: z.literal("grantpath-reviewed-catalogue-1"),
  origin: z.literal("isolated-discovery-expansion"),
  exportedAt: z.iso.datetime(),
  records: z.array(transferRecordSchema).min(1).max(2000),
});
export type TransferRecord = z.infer<typeof transferRecordSchema>;
export type CatalogueBundle = z.infer<typeof catalogueBundleSchema>;

export function validateTransferRecord(record: TransferRecord) {
  if (record.versions.some((v, i) => v.number !== i + 1 || semanticHash(v.data) !== v.semanticHash))
    throw Error("TRANSFER_HISTORY_INTEGRITY");
  const latest = publicationSchema.parse(record.versions.at(-1)!.data);
  if (latest.title.startsWith("[TEST ONLY]")) throw Error("TEST_RECORD_NOT_TRANSFERABLE");
  return latest;
}
const normalizedHash = (data: unknown) => semanticHash(scholarshipDataSchema.parse(data));

export async function planTransferRecord(tx: Prisma.TransactionClient, record: TransferRecord) {
  const latest = validateTransferRecord(record);
  const programme = await tx.programme.findUnique({
    where: { slug: record.programme.slug },
    include: { provider: true },
  });
  if (programme && programme.provider.slug !== record.provider.slug)
    throw Error("TRANSFER_PROVIDER_CONFLICT");
  const existing = programme
    ? await tx.scholarship.findUnique({
        where: { programmeId_cycle: { programmeId: programme.id, cycle: record.cycle } },
        include: { versions: { orderBy: { number: "desc" }, take: 1 } },
      })
    : null;
  const slug = await tx.scholarship.findUnique({
    where: { slug: record.slug },
    select: { id: true },
  });
  if (slug && slug.id !== existing?.id) throw Error("TRANSFER_SLUG_CONFLICT");
  if (existing && (!existing.published || !existing.versions[0]))
    throw Error("TRANSFER_EXISTING_RECORD_HELD");
  const acceptedHash = existing ? normalizedHash(existing.versions[0].data) : null;
  const anchor = acceptedHash
    ? record.versions.findLastIndex((v) => normalizedHash(v.data) === acceptedHash)
    : -1;
  if (existing && anchor < 0) throw Error("TRANSFER_PRODUCTION_EDIT_CONFLICT");
  return {
    existing,
    latest,
    anchor,
    kind: !existing ? "new" : anchor === record.versions.length - 1 ? "unchanged" : "updated",
  };
}

/** Caller must bind/authorize the target database. No source policies or student tables are written. */
export async function importTransferRecord(tx: Prisma.TransactionClient, record: TransferRecord) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`catalogue-import:${record.programme.slug}`}))`;
  const plan = await planTransferRecord(tx, record);
  // Different programmes can share a provider. An emulated empty-update
  // upsert can race across programme locks; INSERT ON CONFLICT cannot.
  await tx.provider.createMany({ data: [record.provider], skipDuplicates: true });
  const provider = await tx.provider.findUniqueOrThrow({ where: { slug: record.provider.slug } });
  const programme = await tx.programme.upsert({
    where: { slug: record.programme.slug },
    create: { ...record.programme, providerId: provider.id },
    update: {},
  });
  const scholarship =
    plan.existing ||
    (await tx.scholarship.create({
      data: {
        slug: record.slug,
        programmeId: programme.id,
        cycle: record.cycle,
        title: plan.latest.title,
        destination: plan.latest.destination,
        level: "",
        field: "",
        fundingType: "unknown",
      },
    }));
  let number = scholarship.version;
  const toAppend = record.versions.slice(plan.anchor + 1);
  // Retain original accepted historical snapshots without sending obsolete
  // application notifications. Only the final current publication emits an event.
  for (const version of toAppend.slice(0, -1)) {
    number++;
    const original = scholarshipDataSchema.parse(version.data);
    await tx.scholarshipVersion.create({
      data: {
        scholarshipId: scholarship.id,
        number,
        data: version.data as Prisma.InputJsonValue,
        semanticHash: version.semanticHash,
        actorId: version.actorId,
        reason: version.reason,
        createdAt: new Date(version.createdAt),
        evidence: {
          create: original.evidence.map((e) => ({ ...e, retrievedAt: new Date(e.retrievedAt) })),
        },
      },
    });
    await tx.scholarship.update({ where: { id: scholarship.id }, data: { version: number } });
  }
  let eventIds: string[] = [];
  if (plan.kind !== "unchanged") {
    const result = await publishScholarshipTx(
      tx,
      {
        id: "release:reviewed-catalogue-import",
        name: "Reviewed catalogue release",
        email: "release@example.test",
        role: "operator",
      },
      scholarship.id,
      plan.latest,
      number,
      "Authorized production transfer of previously validated official-source catalogue; preserve accepted source history and evidence.",
    );
    number = result.version;
    eventIds = result.eventIds;
  } else {
    // Additive read model backfill only; do not change accepted content/history.
    const projection = await tx.scholarship.updateMany({
      where: { id: scholarship.id, version: scholarship.version },
      data: {
        windowKind: plan.latest.applicationWindow?.kind || "unknown",
        windowOpensOn:
          plan.latest.recordKind === "cycle"
            ? plan.latest.applicationWindow?.opensOn || null
            : null,
        windowClosesOn:
          plan.latest.recordKind === "cycle"
            ? plan.latest.applicationWindow?.closesOn || null
            : null,
        opensAt: plan.latest.opensAt,
      },
    });
    if (projection.count !== 1) throw Error("TRANSFER_PRODUCTION_EDIT_CONFLICT");
  }
  // Audit IDs make retries idempotent. Snapshots retain source version numbers,
  // timestamps, actors and reasons even where production has its own history.
  for (const version of record.versions) {
    const id =
      "catalogue-import:" +
      semanticHash({
        origin: "isolated-discovery-expansion",
        sourceId: record.sourceId,
        number: version.number,
        hash: version.semanticHash,
      });
    const existing = await tx.audit.findUnique({ where: { id } });
    if (existing && existing.recordId !== scholarship.id)
      throw Error("TRANSFER_PROVENANCE_CONFLICT");
    if (!existing)
      await tx.audit.create({
        data: {
          id,
          actorId: "release:reviewed-catalogue-import",
          action: "catalogue.import.snapshot",
          recordId: scholarship.id,
          after: {
            sourceId: record.sourceId,
            programme: record.programme.slug,
            cycle: record.cycle,
            ...version,
          } as Prisma.InputJsonValue,
          reason:
            "Preserve original official-source publication snapshot and provenance during authorized catalogue transfer.",
        },
      });
  }
  return { kind: plan.kind, scholarshipId: scholarship.id, version: number, eventIds };
}
