import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { createOpportunity } from "../../src/server/operator";
import { publishScholarship } from "../../src/server/scholarships/publish";
import { catalogue } from "../../src/server/scholarships";
import { enrichApplicationWindow } from "../../src/server/discovery/application-windows";
import { testScholarship } from "../fixtures/scholarship";
import { publicationPolicy } from "../../src/server/discovery/policy";

it("publishes evidenced date-only closure once, preserves facts and filters explicit unannounced schemes", async () => {
  const tag = crypto.randomUUID(),
    operator = {
      id: "test-window-operator",
      name: "Test",
      email: "windows@example.test",
      role: "operator",
    };
  const data = testScholarship();
  for (const field of ["title", "institution", "destination", "cycle"])
    data.evidence.push({
      field,
      url: data.officialUrl,
      passage: "[TEST ONLY] Verified critical fixture evidence.",
      state: "verified",
      retrievedAt: new Date().toISOString(),
    });
  Object.assign(data, {
    availability: "unknown",
    deadline: null,
    deadlineState: "unknown",
    deadlineLabel: null,
    recordKind: "cycle",
    cycleStatus: "confirmed",
  });
  const record = await createOpportunity(operator, {
    slug: `window-${tag}`,
    programmeSlug: `window-${tag}`,
    providerSlug: `window-${tag}`,
    providerName: "[TEST ONLY] Windows",
    providerUrl: "https://www.ucl.ac.uk",
    cycle: "2026/27",
    data,
    reason: "Isolated application window verification.",
  });
  const next = enrichApplicationWindow(
    data,
    { closing: "20 November 2026" },
    data.officialUrl,
    true,
    new Date("2026-11-25T10:00:00Z"),
  );
  expect(next.deadline).toBeNull();
  expect(next.availability).toBe("closed");
  const validation = {
    codes: [],
    structure: true,
    matchedFields: [
      "title",
      "destination",
      "institution",
      "levels",
      "cycle",
      "applicationWindow",
      "availability",
      "deadline",
    ],
    cycleConfirmed: true,
    requirementsComplete: true,
  };
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: next,
      previous: data,
      validation,
    }).decision,
  ).toBe("auto_publish");
  const results = await Promise.all(
    [1, 2].map(() =>
      publishScholarship(
        operator,
        record.id,
        next,
        1,
        "Official date-only closure with no invented timezone.",
      ),
    ),
  );
  expect(results.filter((result) => result.changed)).toHaveLength(1);
  expect(await db().scholarshipVersion.count({ where: { scholarshipId: record.id } })).toBe(2);
  expect(
    await db().outbox.count({ where: { key: { startsWith: `scholarship:${record.id}:` } } }),
  ).toBe(2);
  expect((await catalogue({ provider: `window-${tag}`, availability: "closed" })).total).toBe(1);
  expect((await catalogue({ provider: `window-${tag}`, availability: "open" })).total).toBe(0);
  const scheme = enrichApplicationWindow(
    { ...data, recordKind: "overview", cycleStatus: "unconfirmed" },
    { closing: "TBC" },
    data.officialUrl,
    false,
  );
  const unannounced = await createOpportunity(operator, {
    slug: `unannounced-${tag}`,
    programmeSlug: `unannounced-${tag}`,
    providerSlug: `window-${tag}`,
    providerName: "[TEST ONLY] Windows",
    providerUrl: "https://www.ucl.ac.uk",
    cycle: "Scheme overview",
    data: scheme,
    reason: "Explicit official TBC date remains unannounced.",
  });
  expect(
    (await catalogue({ provider: `window-${tag}`, availability: "unannounced" })).rows[0].id,
  ).toBe(unannounced.id);
  expect((await catalogue({ provider: `window-${tag}`, availability: "confirmation" })).total).toBe(
    0,
  );
  expect(scheme.requirements).toEqual(data.requirements);
  expect(scheme.funding).toEqual(data.funding);
});
