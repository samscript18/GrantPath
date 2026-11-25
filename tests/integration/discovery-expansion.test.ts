import { expect, it, vi } from "vitest";
import { db } from "../../src/lib/db";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import {
  configureDirectory,
  processDirectoryHtml,
  processDetailHtml,
  discoveryOverview,
  processDetailDocument,
} from "../../src/server/discovery/service";
import { resolveDetailMapping } from "../../src/server/discovery/adapter-registry";
import { checkCandidate } from "../../src/server/discovery/worker";
import { sheffieldFixture } from "../fixtures/expansion";
import { saveProfile } from "../../src/server/profiles";
import { saveOpportunity } from "../../src/server/applications";
import { handleDomainEvent } from "../../src/server/jobs/outbox";
import { handleNotificationEvent } from "../../src/server/notifications/events";
import { decideDiscovery } from "../../src/server/discovery/service";
import { claimDelivery, deliverClaimed } from "../../src/server/notifications/delivery";
import * as sourceNetwork from "../../src/server/monitoring/network";

const operator = {
  id: "expansion-test-operator",
  name: "[TEST ONLY] Operator",
  email: "operator@example.test",
  role: "operator",
};
it("publishes and replays a reviewed PDF text contract, and holds an unsupported document without erasing it", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["sheffield-postgraduate-directory"];
  const id = "expansion-pdf-test-" + tag;
  const url = base.url + "/announcement-" + tag + ".pdf";
  const html = sheffieldFixture(tag);
  const mapping = resolveDetailMapping(base, base.url + "/pdf-" + tag, {
    kind: "html",
    text: html,
  })!;
  mapping.url = url;
  mapping.data.officialUrl = url;
  mapping.data.applicationUrl = url;
  mapping.data.evidence = mapping.data.evidence.map((e) => ({ ...e, url }));
  mapping.sections = undefined;
  directoryDefinitions[id] = {
    ...base,
    id,
    url: base.url + "?isolated-pdf=" + tag,
    detailFormat: "pdf",
    dynamicDetail: "reviewed-pdf-announcement-1",
    mappings: [mapping],
  };
  try {
    await configureDirectory(operator, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Reviewed PDF contract in isolated database.",
    });
    const found = await processDirectoryHtml(
      id,
      `<main><h1>Postgraduate scholarships</h1><article><a href="${url}">Official announcement</a></article></main>`,
    );
    const document = {
      kind: "pdf-text" as const,
      text: Object.values(mapping.passages).join(" "),
      pages: 1,
      parserVersion: "controlled-text-fixture",
    };
    const first = await processDetailDocument(found.ids[0], document, { controlled: true });
    expect(first.decision).toBe("auto_publish");
    if (!("scholarshipId" in first) || !first.scholarshipId) throw new Error("Missing publication");
    expect(
      (await processDetailDocument(found.ids[0], document, { controlled: true })).decision,
    ).toBe("unchanged");
    expect(
      (
        await processDetailDocument(
          found.ids[0],
          { ...document, text: "Unsupported scanned PDF layout" },
          { controlled: true },
        )
      ).decision,
    ).toBe("review_required");
    expect(
      await db().scholarshipVersion.count({ where: { scholarshipId: first.scholarshipId } }),
    ).toBe(1);
    expect(
      await db().outbox.count({ where: { key: `scholarship:${first.scholarshipId}:1` } }),
    ).toBe(1);
  } finally {
    delete directoryDefinitions[id];
  }
});
it("discovers unknown routes, publishes once under concurrency, holds missing facts and preserves separate cycles", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["sheffield-postgraduate-directory"];
  const id = "expansion-test-" + tag;
  directoryDefinitions[id] = { ...base, id, url: base.url + "?isolated=" + tag };
  const url = base.url + "/award-" + tag;
  const listing = `<main><h1>Postgraduate scholarships</h1><article><a href="${url}">New award</a><a href="${url}?utm_source=test#top">Duplicate</a><a href="${base.url}/chevening-scholars">Existing government scheme</a></article></main>`;
  try {
    await configureDirectory(operator, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Reviewed template in an isolated database.",
    });
    expect(await db().discoveredCandidate.count({ where: { directoryId: id } })).toBe(0);
    const found = await processDirectoryHtml(id, listing);
    expect(found).toMatchObject({ created: 1, excluded: 1 });
    expect((await processDirectoryHtml(id, listing)).existing).toBe(1);
    const html = sheffieldFixture(tag);
    const decisions = await Promise.all([
      processDetailHtml(found.ids[0], html, { controlled: true }),
      processDetailHtml(found.ids[0], html, { controlled: true }),
    ]);
    expect(decisions.map((d) => d.decision).sort()).toEqual(["auto_publish", "unchanged"]);
    const published = decisions.find((d) => d.decision === "auto_publish")!;
    if (!("scholarshipId" in published) || !published.scholarshipId)
      throw new Error("Missing scholarship");
    const scholarshipId = published.scholarshipId;
    const original = await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } });
    expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${scholarshipId}:1` } })).toBe(1);
    const missing = await processDetailHtml(
      found.ids[0],
      html.replace("Eligibility", "Removed section"),
      { controlled: true },
    );
    expect(missing.decision).toBe("review_required");
    expect(
      (await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } })).version,
    ).toBe(1);
    const metadataConflict = await processDetailHtml(
      found.ids[0],
      html + '<script type="application/ld+json">{</script>',
      { controlled: true },
    );
    expect(metadataConflict.reasonCodes).toContain("STRUCTURED_METADATA_INVALID");
    const next = await processDetailHtml(found.ids[0], sheffieldFixture(tag, 2033), {
      controlled: true,
    });
    expect(next.decision).toBe("auto_publish");
    expect(await db().scholarship.count({ where: { programmeId: original.programmeId } })).toBe(2);
    const overview = await discoveryOverview(operator);
    expect(overview.adapters.some((adapter) => adapter.id === base.dynamicDetail)).toBe(true);
    expect(overview.availableDirectories.find((source) => source.id === id)?.registered).toBe(true);
    const history = await discoveryOverview(operator, scholarshipId);
    expect(
      history.decisions.every(
        (decision) => decision.decision === "auto_publish" && decision.eventIds.length > 0,
      ),
    ).toBe(true);
    expect(history.recentChecks.some((check) => check.decision === "unchanged")).toBe(true);

    // A second approved directory seeing the same URL must reuse programme identity.
    const alias = id + "-alias";
    directoryDefinitions[alias] = {
      ...directoryDefinitions[id],
      id: alias,
      url: base.url + "?isolated=alias-" + tag,
    };
    await configureDirectory(operator, alias, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Cross-directory duplicate URL verification.",
    });
    const duplicate = await processDirectoryHtml(alias, listing);
    expect((await processDetailHtml(duplicate.ids[0], html, { controlled: true })).decision).toBe(
      "unchanged",
    );
    expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(1);
    delete directoryDefinitions[alias];

    // Actual failed retrieval goes through the worker and preserves accepted data.
    await db().discoveredCandidate.update({
      where: { id: found.ids[0] },
      data: { scholarshipId, attempts: 0 },
    });
    const retrieval = vi
      .spyOn(sourceNetwork, "boundedFetchUrl")
      .mockRejectedValue(new Error("Controlled source unavailable"));
    try {
      expect((await checkCandidate(found.ids[0])).state).toBe("failed");
    } finally {
      retrieval.mockRestore();
    }
    expect(
      (await db().scholarship.findUniqueOrThrow({ where: { id: scholarshipId } })).published,
    ).toBe(true);
    expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(1);
    expect(await db().outbox.count({ where: { key: `scholarship:${scholarshipId}:1` } })).toBe(1);
  } finally {
    delete directoryDefinitions[id];
  }
});

it("routes an identity collision to review instead of duplicating an accepted URL", async () => {
  const tag = crypto.randomUUID();
  const { discoveryFixture } = await import("../fixtures/discovery");
  const { directory, mapping, html } = discoveryFixture(tag);
  directoryDefinitions[directory.id] = directory;
  try {
    await configureDirectory(operator, directory.id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Identity collision isolation.",
    });
    const listing = `<main><h1>Controlled directory</h1><a href="${mapping.url}">New</a></main>`;
    const found = await processDirectoryHtml(directory.id, listing);
    expect((await processDetailHtml(found.ids[0], html, { controlled: true })).decision).toBe(
      "auto_publish",
    );
    mapping.key += "-wrong-identity";
    const duplicate = await processDetailHtml(found.ids[0], html, { controlled: true });
    expect(duplicate.reasonCodes).toContain("URL_PROGRAMME_IDENTITY_CONFLICT");
    expect(duplicate.decision).toBe("review_required");
    expect(await db().programme.count({ where: { slug: mapping.key } })).toBe(0);
  } finally {
    delete directoryDefinitions[directory.id];
  }
});

it("sends an operator-reviewed material update through matching and notifications idempotently", async () => {
  const tag = crypto.randomUUID();
  const base = directoryDefinitions["sheffield-postgraduate-directory"];
  const id = "expansion-events-test-" + tag;
  const student = {
    id: tag,
    name: "[TEST ONLY] Student",
    email: `${tag}@example.test`,
    role: "student",
  };
  directoryDefinitions[id] = { ...base, id, url: base.url + "?isolated=" + tag };
  const url = base.url + "/events-" + tag;
  try {
    await db().user.create({ data: student });
    await saveProfile(student, { targetLevel: "master" }, 0, 3);
    await configureDirectory(operator, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Downstream event isolation.",
    });
    const found = await processDirectoryHtml(
      id,
      `<main><h1>Postgraduate scholarships</h1><article><a href="${url}">New</a></article></main>`,
    );
    const html = sheffieldFixture(tag);
    const first = await processDetailHtml(found.ids[0], html, { controlled: true });
    if (!("scholarshipId" in first) || !first.scholarshipId) throw new Error("Missing publication");
    const scholarshipId = first.scholarshipId;
    await saveOpportunity(student, scholarshipId);
    const changed = await processDetailHtml(
      found.ids[0],
      html.replace("tuition fee award", "larger tuition fee award"),
      { controlled: true },
    );
    expect(changed.decision).toBe("review_required");
    if (!("observationId" in changed)) throw new Error("Missing review");
    await decideDiscovery(operator, changed.observationId, {
      decision: "accept",
      reason: "[TEST ONLY] Operator checked changed funding prose.",
    });
    const event = await db().outbox.update({
      where: { key: `scholarship:${scholarshipId}:2` },
      data: {
        state: "processing",
        leaseToken: crypto.randomUUID(),
        lockedUntil: new Date(Date.now() + 120000),
      },
    });
    await handleDomainEvent(event);
    expect(
      await db().outbox.count({
        where: {
          key: { startsWith: `evaluate:${tag}:` },
          payload: { path: ["scholarshipId"], equals: scholarshipId },
        },
      }),
    ).toBe(1);
    const alert = await db().outbox.findUniqueOrThrow({
      where: { key: `change:${scholarshipId}:v2:${tag}` },
    });
    await handleNotificationEvent(alert);
    await handleNotificationEvent(alert);
    const deliveries = await db().delivery.findMany({ where: { userId: tag, eventId: alert.key } });
    for (const delivery of deliveries) {
      const claimed = await claimDelivery(delivery.id);
      if (claimed) await deliverClaimed(claimed);
    }
    expect(await db().notification.count({ where: { userId: tag, eventId: alert.key } })).toBe(1);
    expect(
      (
        await processDetailHtml(
          found.ids[0],
          html.replace("tuition fee award", "larger tuition fee award"),
          { controlled: true },
        )
      ).decision,
    ).toBe("unchanged");
    expect(await db().scholarshipVersion.count({ where: { scholarshipId } })).toBe(2);
  } finally {
    delete directoryDefinitions[id];
    await db().user.deleteMany({ where: { id: tag } });
  }
});
