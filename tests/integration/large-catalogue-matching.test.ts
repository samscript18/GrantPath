import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { saveProfile } from "../../src/server/profiles";
import { matchOverview, recalculateUser } from "../../src/server/eligibility";
import { ENGINE_VERSION } from "../../src/server/eligibility/engine";
import { testScholarship } from "../fixtures/scholarship";

it("recalculates and ranks an unknown-eligibility award beyond record 1000 without truncating totals", async () => {
  const tag = crypto.randomUUID();
  const actor = {
    id: tag,
    name: "[TEST ONLY] Scale student",
    email: `${tag}@example.test`,
    role: "student",
  };
  const operator = { ...actor, id: "test-operator", role: "operator" };
  await db().user.create({ data: actor });
  await saveProfile(actor, { targetLevel: "master" }, 0, 3);
  const data = testScholarship();
  if (data.requirements.kind !== "all") throw Error("Fixture requirements changed");
  data.requirements.rules.push({
    kind: "requirement",
    id: "confirmation",
    label: "Unknown nationality and other conditions",
    field: "providerConfirmation",
    op: "confirmed",
    verified: false,
    evidenceKey: "requirements",
  });
  data.evidence.push({
    field: "requirements",
    url: data.officialUrl,
    state: "missing",
    passage: "[TEST ONLY] Full conditions remain unknown.",
    retrievedAt: new Date().toISOString(),
  });
  const created = await createOpportunity(operator, {
    slug: `scale-${tag}`,
    cycle: "TEST 2027",
    programmeSlug: `scale-${tag}`,
    providerSlug: `scale-${tag}`,
    providerName: "[TEST ONLY] Scale provider",
    providerUrl: "https://www.ucl.ac.uk",
    data,
    reason: "Isolated large catalogue regression fixture.",
  });
  const root = await db().scholarship.findUniqueOrThrow({ where: { id: created.id } });
  const ids = Array.from(
    { length: 1001 },
    (_, n) => `zzzz-scale-${tag}-${String(n).padStart(4, "0")}`,
  );
  try {
    // Bulk fixture setup exercises the real read/matching path without issuing
    // 1001 fake publication events. Never run against the development catalogue.
    await db().scholarship.createMany({
      data: ids.map((id, n) => ({
        id,
        slug: id,
        programmeId: root.programmeId,
        cycle: `TEST ${n}`,
        version: 1,
        title: `[TEST ONLY] Scale ${tag} ${n}`,
        destination: root.destination,
        destinationCodes: root.destinationCodes,
        level: root.level,
        field: root.field,
        fundingType: root.fundingType,
        availability: "open",
        deadline: root.deadline,
        published: true,
      })),
    });
    await db().scholarshipVersion.createMany({
      data: ids.map((id) => ({
        scholarshipId: id,
        number: 1,
        data,
        semanticHash: "isolated-scale-fixture",
        actorId: operator.id,
        reason: "[TEST ONLY] Large catalogue matching fixture, not source discovery evidence.",
      })),
    });
    const target = ids.at(-1)!;
    const scholarships = await db().scholarship.findMany({
      where: { published: true, id: { not: target } },
    });
    await db().evaluation.createMany({
      data: scholarships.map((s) => ({
        userId: actor.id,
        scholarshipId: s.id,
        profileVersion: 1,
        scholarshipVersion: s.version,
        engineVersion: ENGINE_VERSION,
        outcome: "potential",
        result: {},
        rank: -1,
      })),
    });
    expect(await recalculateUser(actor, 1)).toEqual({ processed: 1, remaining: 0 });
    expect(
      (
        await db().evaluation.findFirstOrThrow({
          where: { userId: actor.id, scholarshipId: target },
        })
      ).outcome,
    ).toBe("potential");
    const count = await db().scholarship.count({ where: { published: true } });
    const first = await matchOverview(actor),
      second = await matchOverview(actor, 2);
    expect(first.total).toBe(count);
    expect(first.pending).toBe(0);
    expect(first.matches).toHaveLength(50);
    expect(first.matches[0].id).toBe(target);
    expect(first.summary.needsConfirmation).toBeGreaterThanOrEqual(1001);
    expect(second.matches).toHaveLength(50);
    expect(second.matches.some((row) => first.matches.some((other) => row.id === other.id))).toBe(
      false,
    );
    expect(await recalculateUser(actor)).toEqual({ processed: 0, remaining: 0 });
  } finally {
    await db().user.delete({ where: { id: actor.id } });
    await db().scholarship.updateMany({
      where: { programmeId: root.programmeId },
      data: { published: false },
    });
  }
});
