import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import {
  configureDirectory,
  processDirectoryHtml,
  processDetailHtml,
  discoveryOverview,
} from "../../src/server/discovery/service";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { discoveryFixture } from "../fixtures/discovery";
import { catalogue } from "../../src/server/scholarships";
const operator = {
  id: "test-discovery-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
describe("actual persisted discovery and publication pipeline", () => {
  it("publishes one joint programme, filters both destinations, replays concurrently, preserves cycles and holds exceptions", async () => {
    const tag = crypto.randomUUID();
    const { directory, mapping, html } = discoveryFixture(tag);
    directoryDefinitions[directory.id] = directory;
    await expect(
      configureDirectory({ ...operator, role: "student" }, directory.id, {
        enabled: true,
        autoPublish: true,
        reason: "Isolated policy registration.",
      }),
    ).rejects.toThrow("Operator");
    await configureDirectory(operator, directory.id, {
      enabled: true,
      autoPublish: true,
      reason: "Isolated approved directory fixture.",
    });
    const listing = `<main><h1>Controlled directory</h1><a href="${mapping.url}">Programme</a><a href="${mapping.url}?utm_source=test">Duplicate</a></main>`;
    const found = await processDirectoryHtml(directory.id, listing);
    expect(found.ids).toHaveLength(1);
    const result = await processDetailHtml(found.ids[0], html, { controlled: true });
    expect(result.decision).toBe("auto_publish");
    if (!("scholarshipId" in result) || !result.scholarshipId)
      throw new Error("Missing published record");
    const id = result.scholarshipId;
    await expect(discoveryOverview({ ...operator, role: "student" }, id)).rejects.toThrow(
      "Operator",
    );
    const scoped = await discoveryOverview(operator, id);
    expect(scoped.decisions.length).toBeGreaterThan(0);
    expect(scoped.decisions.every((decision) => decision.scholarshipId === id)).toBe(true);
    expect(scoped.decisions[0].eventIds.length).toBeGreaterThan(0);
    expect((await discoveryOverview(operator, "nonexistent-scholarship")).decisions).toEqual([]);
    await expect(discoveryOverview(operator, "x".repeat(129))).rejects.toThrow();
    const s = await db().scholarship.findUniqueOrThrow({ where: { id } });
    expect(s.destinationCodes.sort()).toEqual(["DE", "GB"]);
    expect(s.version).toBe(1);
    expect(
      (await catalogue({ q: tag, destination: "DE", availability: "all" })).rows.some(
        (r) => r.id === id,
      ),
    ).toBe(true);
    expect(
      (await catalogue({ q: tag, destination: "GB", availability: "all" })).rows.some(
        (r) => r.id === id,
      ),
    ).toBe(true);
    const replay = await Promise.all([
      processDetailHtml(found.ids[0], html, { controlled: true }),
      processDetailHtml(found.ids[0], html, { controlled: true }),
    ]);
    expect(replay.map((r) => r.decision)).toEqual(["unchanged", "unchanged"]);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId: id } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${id}:1` } })).toBe(1);
    const drift = await processDetailHtml(
      found.ids[0],
      html.replace("Master degree only", "Unsupported alternative requirements"),
      { controlled: true },
    );
    expect(drift.decision).toBe("review_required");
    expect(drift.reasonCodes).toContain("UNSUPPORTED_SECTION_CHANGE");
    expect((await db().scholarship.findUniqueOrThrow({ where: { id } })).version).toBe(1);
    expect(
      (await discoveryOverview(operator)).candidates.some(
        (c) => c.id === found.ids[0] && c.state === "review",
      ),
    ).toBe(true);
    await configureDirectory(operator, directory.id, {
      enabled: true,
      autoPublish: false,
      reason: "Pause automatic publication safely.",
    });
    const paused = await processDetailHtml(found.ids[0], html, { controlled: true });
    expect(paused.reasonCodes).toContain("POLICY_PAUSED");
    await configureDirectory(operator, directory.id, {
      enabled: true,
      autoPublish: true,
      reason: "Restore isolated approved policy.",
    });
    // A second canonical official link maps to the same programme/cycle identity.
    const alias = { ...mapping, url: mapping.url + "/details" };
    directory.mappings.push(alias);
    const second = await processDirectoryHtml(
      directory.id,
      `<main><h1>Controlled directory</h1><a href="${alias.url}">Alias</a></main>`,
    );
    await processDetailHtml(second.ids[0], html, { controlled: true });
    expect(await db().scholarship.count({ where: { programmeId: s.programmeId } })).toBe(1);
    mapping.cycle = "TEST 2028";
    mapping.passages.cycle = "TEST 2028";
    mapping.data.evidence.find((e) => e.field === "cycle")!.passage = "TEST 2028";
    const next = await processDetailHtml(found.ids[0], html.replaceAll("TEST 2027", "TEST 2028"), {
      controlled: true,
    });
    expect(next.decision).toBe("auto_publish");
    expect(await db().scholarship.count({ where: { programmeId: s.programmeId } })).toBe(2);
    expect((await db().scholarship.findUniqueOrThrow({ where: { id } })).version).toBe(1);
    delete directoryDefinitions[directory.id];
  });
});

it("automatically discovers a previously unregistered programme URL and preserves separate cycles through the actual publisher", async () => {
  const url = "https://apply.mastercardfoundation.mak.ac.ug/scholarships";
  const existingDirectory = await db().discoveryDirectory.findUnique({ where: { url } });
  if (existingDirectory && !existingDirectory.id.startsWith("makerere-template-test-"))
    throw Error("Official-template fixture requires its own isolated directory");
  const id = existingDirectory?.id ?? "makerere-template-test-" + crypto.randomUUID();
  const existingCycles = await db().scholarship.findMany({
    where: { programme: { slug: "makerere-mastercard-undergraduate" } },
    select: { cycle: true },
  });
  directoryDefinitions[id] = {
    id,
    url,
    heading: "Scholarships",
    linkSelector: "a[href]",
    allowedDetails: [
      { host: "apply.mastercardfoundation.mak.ac.ug", pathPrefix: "/announcements/" },
    ],
    mappings: [],
    dynamicDetail: "makerere-announcement-1",
  };
  await configureDirectory(operator, id, {
    enabled: true,
    autoPublish: true,
    reason: "[TEST ONLY] Isolated official-template contract verification.",
  });
  const html = (cycle: string) =>
    `<main><h1>Scholarships for Undergraduate Programmes ${cycle}</h1><p>Mastercard Foundation Scholars Program at Makerere University</p><p>Makerere University Main Campus</p></main>`;
  const found = await processDirectoryHtml(
    id,
    `<main><h1>Scholarships</h1><a href="/announcements/98765">Undergraduate call</a></main>`,
  );
  const first = await processDetailHtml(found.ids[0], html("2028/2029"), { controlled: true });
  expect(first.decision).toBe(
    existingCycles.some((s) => s.cycle === "2028/2029") ? "unchanged" : "auto_publish",
  );
  expect(
    (await processDetailHtml(found.ids[0], html("2028/2029"), { controlled: true })).decision,
  ).toBe("unchanged");
  const next = await processDetailHtml(found.ids[0], html("2029/2030"), { controlled: true });
  expect(next.decision).toBe(
    existingCycles.some((s) => s.cycle === "2029/2030") ? "unchanged" : "auto_publish",
  );
  if (!("scholarshipId" in first) || !first.scholarshipId || !("scholarshipId" in next))
    throw Error("Missing actual accepted cycle");
  expect(next.scholarshipId).not.toBe(first.scholarshipId);
  expect(
    (await db().scholarship.findUniqueOrThrow({ where: { id: first.scholarshipId } })).version,
  ).toBe(1);
  delete directoryDefinitions[id];
});
