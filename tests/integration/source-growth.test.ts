import { expect, it } from "vitest";
import { db } from "../../src/lib/db";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import {
  configureDirectory,
  processDirectoryHtml,
  processDetailHtml,
} from "../../src/server/discovery/service";
import { universityFundingFixtures } from "../fixtures/university-funding";
const actor = {
  id: "test-growth-operator",
  name: "[TEST ONLY] Growth operator",
  email: "operator@example.test",
  role: "operator",
};

it("holds separate JASSO entry-route and component listings under one provider/programme identity", async () => {
  const tag = crypto.randomUUID(),
    id = `test-jasso-variants-${tag}`,
    base = directoryDefinitions["jasso-scholarship-search"];
  directoryDefinitions[id] = { ...base, id, url: `${base.url}&isolated=${tag}` };
  const otherId = id + "-other";
  directoryDefinitions[otherId] = {
    ...base,
    id: otherId,
    url: `${base.url}&isolated=${tag}-other`,
  };
  const serial = Date.now();
  const urls = [1, 2, 3].map(
    (n) =>
      `https://www.studyinjapan.go.jp/en/search-for-scholarships/detail.php?lang=en&mid=${n}-${serial}`,
  );
  const title = `[TEST ONLY] Foundation scholarship ${tag}`;
  const snapshot = (name: string) =>
    `<main><h1 class="mainTitle">${name}</h1><div class="school-name">[TEST ONLY] Foundation ${tag}</div><table><tr><th>Academic level</th><td>Master's degree program</td></tr><tr><th>Amount of scholarship (yen)</th><td>200,000 yen per month</td></tr></table><h2>Basic information</h2><p>The scholarship is limited to eligible admitted students. Nationality, residence, age, funding exclusions and current application dates require confirmation from the official provider.</p><h2>About recruitment</h2><p>Applications must be made according to the official instructions for this foundation scholarship.</p></main>`;
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Separate entry-route identity review.",
    });
    const found = await processDirectoryHtml(
      id,
      `<h1>Scholarship search</h1>${urls.map((url) => `<a class="school-result-item" href="${url}">Scholarship</a>`).join("")}`,
    );
    await configureDirectory(actor, otherId, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Concurrent source identity review.",
    });
    const other = await processDirectoryHtml(
      otherId,
      `<h1>Scholarship search</h1><a class="school-result-item" href="${urls[1]}">Scholarship</a>`,
    );
    const ids = [found.ids[0], other.ids[0]];
    const snapshots = [snapshot(title), snapshot(title + " [Pre-Arrival Admission]")];
    const initial = await Promise.all(
      ids.map((candidateId, i) =>
        processDetailHtml(candidateId, snapshots[i], { controlled: true }),
      ),
    );
    expect(initial.map((row) => row.decision).sort()).toEqual(["auto_publish", "review_required"]);
    const held = [
      initial.find((row) => row.decision === "review_required")!,
      await processDetailHtml(found.ids[2], snapshot(title), { controlled: true }),
    ];
    for (const result of held) {
      expect(result.decision).toBe("review_required");
      expect(result.reasonCodes).toContain("PROGRAMME_VARIANT_IDENTITY_REQUIRES_REVIEW");
    }
    expect(
      await db().scholarship.count({ where: { published: true, title: { contains: tag } } }),
    ).toBe(1);
    expect(
      (
        await processDetailHtml(
          ids[initial.findIndex((row) => row.decision === "auto_publish")],
          snapshots[initial.findIndex((row) => row.decision === "auto_publish")],
          { controlled: true },
        )
      ).decision,
    ).toBe("unchanged");
  } finally {
    delete directoryDefinitions[id];
    delete directoryDefinitions[otherId];
  }
});

it("discovers an unseen award past a full first candidate window and preserves replay/event idempotency", async () => {
  const tag = crypto.randomUUID(),
    base = directoryDefinitions["uq-scholarships"],
    id = "test-large-directory-" + tag;
  directoryDefinitions[id] = { ...base, id, url: base.url + "?isolated=" + tag };
  const urls = Array.from(
    { length: 125 },
    (_, i) =>
      `https://scholarships.uq.edu.au/scholarship/test-${tag}-${String(i).padStart(3, "0")}`,
  );
  const html =
    "<h1>Find a scholarship</h1>" +
    urls.map((url) => `<a class="card__link" href="${url}">[TEST ONLY] Scholarship</a>`).join("");
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Large official directory candidate-window isolation.",
    });
    const first = await processDirectoryHtml(id, html);
    expect(first.created).toBe(100);
    const second = await processDirectoryHtml(id, html);
    expect(second.created).toBe(25);
    expect(await db().discoveredCandidate.count({ where: { directoryId: id } })).toBe(125);
    const newUrl = urls[124],
      candidate = await db().discoveredCandidate.findUniqueOrThrow({
        where: { directoryId_canonicalUrl: { directoryId: id, canonicalUrl: newUrl } },
      });
    expect(second.ids).toContain(candidate.id);
    const result = await processDetailHtml(
      candidate.id,
      universityFundingFixtures["uq-scholarships"],
      { controlled: true },
    );
    expect(result.decision).toBe("auto_publish");
    if (!("scholarshipId" in result) || !result.scholarshipId) throw Error("Missing publication");
    expect(
      (
        await processDetailHtml(candidate.id, universityFundingFixtures["uq-scholarships"], {
          controlled: true,
        })
      ).decision,
    ).toBe("unchanged");
    expect(
      await db().scholarshipVersion.count({ where: { scholarshipId: result.scholarshipId } }),
    ).toBe(1);
    expect(
      await db().outbox.count({ where: { key: `scholarship:${result.scholarshipId}:1` } }),
    ).toBe(1);
  } finally {
    delete directoryDefinitions[id];
  }
});

it("preserves a new Imperial intake as one programme with separate immutable cycles", async () => {
  const tag = crypto.randomUUID(),
    base = directoryDefinitions["imperial-scholarships"],
    id = "test-cms-cycle-" + tag;
  directoryDefinitions[id] = { ...base, id, url: base.url + "?isolated=" + tag };
  const url = base.url + `example-${tag}-20352036.php`,
    nextUrl = url.replace("20352036", "20362037");
  const listing = (url: string) =>
    `<h1>Search our scholarships</h1><h2 class="award-card__title"><a href="${url}">[TEST ONLY] Award</a></h2>`;
  try {
    await configureDirectory(actor, id, {
      enabled: true,
      autoPublish: true,
      reason: "[TEST ONLY] Reviewed CMS cycle and immutable-version contract.",
    });
    const first = await processDirectoryHtml(id, listing(url));
    const a = await processDetailHtml(
      first.ids[0],
      universityFundingFixtures["imperial-scholarships"],
      { controlled: true },
    );
    const second = await processDirectoryHtml(id, listing(nextUrl));
    const b = await processDetailHtml(
      second.ids[0],
      universityFundingFixtures["imperial-scholarships"].replaceAll("2035/2036", "2036/2037"),
      { controlled: true },
    );
    expect(a.decision).toBe("auto_publish");
    expect(b.decision).toBe("auto_publish");
    if (!("scholarshipId" in a) || !("scholarshipId" in b) || !a.scholarshipId || !b.scholarshipId)
      throw Error("Missing cycles");
    const records = await db().scholarship.findMany({
      where: { id: { in: [a.scholarshipId, b.scholarshipId] } },
    });
    expect(new Set(records.map((row) => row.programmeId)).size).toBe(1);
    expect(records.map((row) => row.cycle).sort()).toEqual(["2035/2036", "2036/2037"]);
  } finally {
    delete directoryDefinitions[id];
  }
});
