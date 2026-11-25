import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import {
  configureDirectory,
  processDirectoryHtml,
  processDetailHtml,
} from "../../src/server/discovery/service";
import { universityFundingFixtures } from "../fixtures/university-funding";
import { availabilityOf } from "../../src/server/scholarships/schema";
import { availabilityWhere } from "../../src/server/scholarships/availability";
it("keeps a scheme and successive dated application rounds under one programme with idempotent versions and events", async () => {
  const tag = crypto.randomUUID(),
    id = `test-current-calls-${tag}`,
    base = directoryDefinitions["uq-scholarships"];
  const url = `https://scholarships.uq.edu.au/scholarship/test-call-${tag}`;
  directoryDefinitions[id] = {
    ...base,
    id,
    url: base.url + "?fixture=" + tag,
    discoverApplicationRounds: false,
  };
  const actor = {
    id: "test-call-operator",
    name: "Test",
    email: "calls@example.test",
    role: "operator",
  };
  const html = (opening: string, closing: string) =>
    universityFundingFixtures["uq-scholarships"]
      .replace("UQ Research Scholarship", `UQ Research Scholarship ${tag}`)
      .replace(
        "</dl>",
        `<dt>Applications open</dt><dd>${opening}</dd><dt>Applications close</dt><dd>${closing}</dd></dl>`,
      );
  const options = { controlled: true, now: new Date("2035-11-25T12:00:00Z") };
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Distinct confirmed application rounds under a single programme.",
    });
    const found = await processDirectoryHtml(
      id,
      `<h1>Find a scholarship</h1><a class="card__link" href="${url}">[TEST ONLY] Research award</a>`,
    );
    const scheme = await processDetailHtml(
      found.ids[0],
      html("1 November 2035", "15 January 2036"),
      options,
    );
    expect(scheme.decision).toBe("auto_publish");
    directoryDefinitions[id].discoverApplicationRounds = true;
    const first = await processDetailHtml(
      found.ids[0],
      html("1 November 2035", "15 January 2036"),
      options,
    );
    expect(first.decision).toBe("auto_publish");
    if (!("scholarshipId" in first) || !("scholarshipId" in scheme))
      throw Error("Missing published fixture identity");
    expect(first.scholarshipId).not.toBe(scheme.scholarshipId);
    const firstRow = await db().scholarship.findUniqueOrThrow({
      where: { id: first.scholarshipId! },
    });
    const schemeRow = await db().scholarship.findUniqueOrThrow({
      where: { id: scheme.scholarshipId! },
    });
    expect(firstRow.programmeId).toBe(schemeRow.programmeId);
    expect(firstRow.availability).toBe("open");
    const replay = await processDetailHtml(
      found.ids[0],
      html("1 November 2035", "15 January 2036"),
      options,
    );
    expect(replay.decision).toBe("unchanged");
    const extended = await processDetailHtml(
      found.ids[0],
      html("1 November 2035", "31 January 2036"),
      options,
    );
    expect(extended.decision).toBe("review_required");
    expect(extended.reasonCodes).toContain("APPLICATION_ROUND_IDENTITY_REQUIRES_REVIEW");
    expect(await db().scholarship.count({ where: { programmeId: firstRow.programmeId } })).toBe(2);
    const second = await processDetailHtml(
      found.ids[0],
      html("1 February 2036", "31 March 2036"),
      options,
    );
    expect(second.decision).toBe("auto_publish");
    if (!("scholarshipId" in second)) throw Error("Missing next-round identity");
    const secondRow = await db().scholarship.findUniqueOrThrow({
      where: { id: second.scholarshipId! },
    });
    expect(secondRow.programmeId).toBe(firstRow.programmeId);
    expect(secondRow.availability).toBe("upcoming");
    // SQL filters and rendered badges must agree as calendar-only calls move
    // through uncertainty and expiration; clock movement creates no versions.
    for (const instant of [
      "2035-11-25T12:00:00Z",
      "2036-01-14T10:00:00Z",
      "2036-01-17T00:00:00Z",
      "2036-02-01T00:00:00Z",
      "2036-02-03T00:00:00Z",
    ]) {
      const now = new Date(instant);
      const rows = await db().scholarship.findMany({
        where: { programmeId: firstRow.programmeId },
      });
      for (const status of ["open", "upcoming", "closed", "unknown"] as const) {
        const filtered = await db().scholarship.findMany({
          where: { programmeId: firstRow.programmeId, AND: [availabilityWhere(status, now)] },
        });
        expect(filtered.map((row) => row.id).sort()).toEqual(
          rows
            .filter((row) => availabilityOf(row, now) === status)
            .map((row) => row.id)
            .sort(),
        );
      }
    }
    expect(await db().scholarship.count({ where: { programmeId: firstRow.programmeId } })).toBe(3);
    for (const scholarshipId of [
      scheme.scholarshipId!,
      first.scholarshipId!,
      second.scholarshipId!,
    ]) {
      expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(1);
      expect(
        await db().outbox.count({
          where: { key: { startsWith: `scholarship:${scholarshipId}:` } },
        }),
      ).toBe(1);
    }
  } finally {
    delete directoryDefinitions[id];
  }
});
