import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import {
  configureDirectory,
  processDirectoryHtml,
  processDetailHtml,
  decideDiscovery,
} from "../../src/server/discovery/service";
import { checkCandidate } from "../../src/server/discovery/worker";
import { catalogue } from "../../src/server/scholarships";
import { twenteFixture } from "../fixtures/twente";
const actor = {
  id: "test-growth-operator",
  name: "Test operator",
  email: "operator@example.test",
  role: "operator",
};
it("discovers, publishes and replays an unseen template award through the real transaction, holds changes, and lets operators review them", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["twente-scholarships"];
  const id = "test-growth-" + tag;
  const directory = { ...base, id, url: base.url + "?fixture=" + tag };
  directoryDefinitions[id] = directory;
  const url = base.url + "itc-test-" + tag + "-scholarship-programme/";
  const html = twenteFixture();
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Isolated template-to-publication verification.",
    });
    const listing = `<main><h1>Find your scholarship</h1><div class="grantfinder__scholarship"><a class="scholarship__title" href="${url}">[TEST ONLY] Award</a><a class="scholarship__title" href="${url}?utm_source=test">Duplicate</a></div></main>`;
    const found = await processDirectoryHtml(id, listing);
    expect(found.created).toBe(1);
    expect(found.ids).toHaveLength(1);
    expect((await processDirectoryHtml(id, listing)).existing).toBe(1);
    const first = await processDetailHtml(found.ids[0], html, { controlled: true });
    expect(first.decision).toBe("auto_publish");
    if (!("scholarshipId" in first) || !first.scholarshipId) throw Error("No published record");
    const scholarshipId = first.scholarshipId;
    expect((await catalogue({ q: tag, destination: "NL", availability: "all" })).total).toBe(0); // URL identity is not invented title text.
    const published = await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } });
    expect(
      (
        await catalogue({ q: "[TEST ONLY] ITC Example", destination: "NL", availability: "all" })
      ).rows.some((r) => r.id === scholarshipId),
    ).toBe(true);
    const replay = await Promise.all([
      processDetailHtml(found.ids[0], html, { controlled: true }),
      processDetailHtml(found.ids[0], html, { controlled: true }),
    ]);
    expect(replay.map((r) => r.decision)).toEqual(["unchanged", "unchanged"]);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${scholarshipId}:1` } })).toBe(1);
    const changed = await processDetailHtml(found.ids[0], html.replace("€ 12,000", "€ 13,000"), {
      controlled: true,
    });
    expect(changed.decision).toBe("review_required");
    if (!("observationId" in changed)) throw Error("No observation");
    await expect(
      decideDiscovery({ ...actor, role: "student" }, changed.observationId, {
        decision: "accept",
        reason: "[TEST ONLY] No permission.",
      }),
    ).rejects.toThrow("Operator");
    await decideDiscovery(actor, changed.observationId, {
      decision: "accept",
      reason: "[TEST ONLY] Operator checked the isolated amount change.",
    });
    expect(
      (await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } })).version,
    ).toBe(2);
    expect(published.version).toBe(1);
    const next = await processDetailHtml(found.ids[0], twenteFixture(2031), { controlled: true });
    expect(next.decision).toBe("auto_publish");
    expect(await db().scholarship.count({ where: { programmeId: published.programmeId } })).toBe(2);
  } finally {
    delete directoryDefinitions[id];
  }
});
it("retires old pending navigation without fetching or deleting its history", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["twente-scholarships"];
  const id = "test-navigation-" + tag;
  directoryDefinitions[id] = { ...base, id, url: base.url + "?fixture=" + tag };
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Old navigation backlog verification.",
    });
    const c = await db().discoveredCandidate.create({
      data: {
        directoryId: id,
        canonicalUrl: base.url + "prodigy-finance/",
        discoveredFrom: base.url,
      },
    });
    expect(await checkCandidate(c.id)).toMatchObject({
      state: "ignored",
      reasons: ["NOT_A_SUPPORTED_OPPORTUNITY_LINK"],
    });
    const row = await db().discoveredCandidate.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.attempts).toBe(0);
    expect(row.state).toBe("ignored");
    expect(
      await db().audit.count({ where: { recordId: c.id, action: "discovery.exclude-navigation" } }),
    ).toBe(1);
  } finally {
    delete directoryDefinitions[id];
  }
});

it("defers scheduled new candidates while explicit source processing remains available", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["twente-scholarships"];
  const id = "test-deferred-" + tag;
  directoryDefinitions[id] = { ...base, id, url: base.url + "?fixture=" + tag };
  try {
    const startAfter = new Date(Date.now() + 24 * 3600000);
    await expect(
      configureDirectory(actor, id, {
        enabled: true,
        autoPublish: true,
        reason: "[TEST ONLY] Invalid activation time.",
        startAfter: new Date("invalid"),
      }),
    ).rejects.toThrow("Deferred activation");
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Reviewed deployment activation window.",
      startAfter,
    });
    const url = base.url + "itc-deferred-" + tag + "-scholarship-programme/";
    const found = await processDirectoryHtml(
      id,
      `<h1>Find your scholarship</h1><div class="grantfinder__scholarship"><a class="scholarship__title" href="${url}">Award</a></div>`,
    );
    const c = await db().discoveredCandidate.findUniqueOrThrow({ where: { id: found.ids[0] } });
    expect(c.nextAttemptAt.getTime()).toBe(startAfter.getTime());
    expect((await processDetailHtml(c.id, twenteFixture(), { controlled: true })).decision).toBe(
      "auto_publish",
    );
    await configureDirectory(actor, id, {
      enabled: false,
      autoPublish: false,
      reason: "[TEST ONLY] Pause until reviewed adapter deployment.",
    });
    expect((await db().discoveredCandidate.findUniqueOrThrow({ where: { id: c.id } })).state).toBe(
      "published",
    );
  } finally {
    delete directoryDefinitions[id];
  }
});
