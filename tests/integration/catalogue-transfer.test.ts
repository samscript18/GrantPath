import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { testScholarship } from "../fixtures/scholarship";
import { publicationSchema } from "../../src/server/scholarships/schema";
import { semanticHash, publishScholarshipTx } from "../../src/server/scholarships/publish";
import {
  importTransferRecord,
  type TransferRecord,
} from "../../src/server/scholarships/catalogue-transfer";
it("imports complete evidence/history once, emits only the latest event, preserves applications and refuses production edits", async () => {
  const tag = crypto.randomUUID();
  const base = publicationSchema.parse({ ...testScholarship(), title: `Transfer fixture ${tag}` });
  const second = publicationSchema.parse({ ...base, summary: base.summary + " Source update." });
  const record: TransferRecord = {
    sourceId: `source-${tag}`,
    slug: `transfer-${tag}`,
    cycle: "2027",
    provider: {
      slug: `transfer-provider-${tag}`,
      name: "Isolated transfer fixture",
      url: "https://example.test",
      countryCode: null,
    },
    programme: { slug: `transfer-programme-${tag}`, name: "Isolated fixture" },
    versions: [base, second].map((data, i) => ({
      number: i + 1,
      data,
      semanticHash: semanticHash(data),
      actorId: "source-operator",
      reason: "Previously reviewed fixture",
      createdAt: `2026-10-${25 + i}T10:00:00.000Z`,
    })),
  };
  const run = () => db().$transaction((tx) => importTransferRecord(tx, record));
  const first = await run();
  expect(first.kind).toBe("new");
  expect(first.version).toBe(2);
  expect(
    await db().scholarshipVersion.count({ where: { scholarshipId: first.scholarshipId } }),
  ).toBe(2);
  expect(
    await db().outbox.count({
      where: { key: { startsWith: `scholarship:${first.scholarshipId}:` } },
    }),
  ).toBe(1);
  const history = await db().scholarshipVersion.findMany({
    where: { scholarshipId: first.scholarshipId },
    orderBy: { number: "asc" },
    include: { evidence: true },
  });
  expect(history[0].createdAt.toISOString()).toBe(record.versions[0].createdAt);
  expect(history[0].evidence).toHaveLength(base.evidence.length);
  const user = await db().user.create({
    data: {
      id: `transfer-user-${tag}`,
      name: "Transfer test",
      email: `transfer-${tag}@example.test`,
    },
  });
  const application = await db().application.create({
    data: {
      userId: user.id,
      scholarshipId: first.scholarshipId,
      notes: "Preserve this private note",
      checklist: [],
      status: "Preparing",
    },
  });
  const replay = await Promise.all([run(), run()]);
  expect(replay.map((x) => x.kind)).toEqual(["unchanged", "unchanged"]);
  expect(
    await db().outbox.count({
      where: { key: { startsWith: `scholarship:${first.scholarshipId}:` } },
    }),
  ).toBe(1);
  expect(
    await db().audit.count({
      where: { recordId: first.scholarshipId, action: "catalogue.import.snapshot" },
    }),
  ).toBe(2);
  expect(await db().application.findUnique({ where: { id: application.id } })).toEqual(application);
  const third = publicationSchema.parse({
    ...second,
    summary: second.summary + " Next official update.",
  });
  record.versions.push({
    number: 3,
    data: third,
    semanticHash: semanticHash(third),
    actorId: "source-operator",
    reason: "Newly accepted source version",
    createdAt: "2026-11-01T10:00:00.000Z",
  });
  const update = await run();
  expect(update.kind).toBe("updated");
  expect(update.scholarshipId).toBe(first.scholarshipId);
  expect(update.version).toBe(3);
  expect(await db().application.findUnique({ where: { id: application.id } })).toEqual(application);
  const changed = publicationSchema.parse({
    ...third,
    summary: "Production operator accepted a different interpretation.",
  });
  await db().$transaction((tx) =>
    publishScholarshipTx(
      tx,
      {
        id: "production-operator",
        name: "Fixture",
        email: "operator@example.test",
        role: "operator",
      },
      first.scholarshipId,
      changed,
      3,
      "Production operator independently reviewed a new interpretation.",
    ),
  );
  await expect(run()).rejects.toThrow("TRANSFER_PRODUCTION_EDIT_CONFLICT");
  expect(await db().application.findUnique({ where: { id: application.id } })).toEqual(application);
});
it("rejects corrupt publication history before creating a provider", async () => {
  const tag = crypto.randomUUID();
  const data = publicationSchema.parse({
    ...testScholarship(),
    title: `Corrupt isolated transfer ${tag}`,
  });
  const record: TransferRecord = {
    sourceId: tag,
    slug: tag,
    cycle: "2027",
    provider: { slug: tag, name: "Fixture", url: "https://example.test", countryCode: null },
    programme: { slug: tag, name: "Fixture" },
    versions: [
      {
        number: 1,
        data,
        semanticHash: "0".repeat(64),
        actorId: "fixture",
        reason: "Corrupt fixture",
        createdAt: "2026-11-01T00:00:00.000Z",
      },
    ],
  };
  await expect(db().$transaction((tx) => importTransferRecord(tx, record))).rejects.toThrow(
    "TRANSFER_HISTORY_INTEGRITY",
  );
  expect(await db().provider.findUnique({ where: { slug: tag } })).toBeNull();
});
