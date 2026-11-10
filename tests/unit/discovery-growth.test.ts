import { expect, it } from "vitest";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { twenteAward } from "../../src/server/discovery/twente";
import { extractDetail, extractDirectory } from "../../src/server/discovery/adapters";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { discoveryRunSummary } from "../../src/server/discovery/report";
import { evaluate } from "../../src/server/eligibility/engine";
import { emptyProfile } from "../../src/server/profiles/schema";
import { twenteFixture, twenteTestUrl } from "../fixtures/twente";
const directory = directoryDefinitions["twente-scholarships"];
it("extracts an unseen supported award with original funding/date and mandatory uncertainty", () => {
  const html = twenteFixture();
  const mapping = twenteAward(directory, twenteTestUrl, html)!;
  expect(mapping).toBeDefined();
  const extracted = extractDetail(mapping, html);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: extracted.data,
      validation: extracted.validation,
    }).decision,
  ).toBe("auto_publish");
  expect(mapping.data.fundingType).toBe("partial");
  expect(mapping.data.deadline).toBeNull();
  expect(mapping.data.deadlineState).toBe("date_only");
  expect(mapping.data.availability).toBe("unknown");
  expect(mapping.cycle).toBe("2030/2031");
  expect(
    evaluate(mapping.data.requirements, { ...emptyProfile(), targetLevel: "master" }).outcome,
  ).toBe("potential");
  expect(twenteAward(directory, twenteTestUrl, twenteFixture(2031))!.cycle).not.toBe(mapping.cycle);
});
it("holds layout loss, unsupported dates, missing level, foreign identity and oversized conditions", () => {
  for (const html of [
    twenteFixture().replace('class="page-main"', 'class="changed"'),
    twenteFixture().replace("1 April 2030", "April 2030"),
    twenteFixture().replace("1 April 2030", "31 April 2030"),
    twenteFixture().replace("Master's programmes", "All programmes"),
    twenteFixture().replace("University of Twente", "Another university"),
    twenteFixture().replace("Selection is not guaranteed.", "x".repeat(8100)),
  ])
    expect(twenteAward(directory, twenteTestUrl, html)).toBeUndefined();
  expect(
    twenteAward(
      directory,
      twenteTestUrl.replace("www.utwente.nl", "evil.example"),
      twenteFixture(),
    ),
  ).toBeUndefined();
});
it("holds changed conditions and funding rather than silently accepting a newly added condition", () => {
  const first = twenteAward(directory, twenteTestUrl, twenteFixture())!;
  const nextHtml = twenteFixture().replace(
    "Selection is not guaranteed.",
    "Selection is not guaranteed. A new language certificate is mandatory.",
  );
  const changed = extractDetail(twenteAward(directory, twenteTestUrl, nextHtml)!, nextHtml);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      previous: first.data,
      candidate: changed.data,
      validation: changed.validation,
    }).decision,
  ).toBe("review_required");
});
it("keeps navigation and external awards out while deduplicating approved detail links", () => {
  const html = `<main><h1>Find your scholarship</h1><div class="grantfinder__scholarship"><a class="scholarship__title" href="${twenteTestUrl}">Award</a><a class="scholarship__title" href="${twenteTestUrl}?utm_source=example#top">Duplicate</a><a class="scholarship__title" href="/en/education/scholarship-finder/prodigy-finance/">Loan</a></div><a href="/en/education/master/">General navigation</a></main>`;
  expect(extractDirectory(directory, html).links).toEqual([twenteTestUrl]);
  const uct = directoryDefinitions["uct-scholarships"];
  expect(
    extractDirectory(
      uct,
      `<main><h1>${uct.heading}</h1><a href="${uct.mappings[0].url}">Official details</a><a href="https://uct.ac.za/mastercardfdn/alumni">Alumni</a></main>`,
    ).links,
  ).toEqual([uct.mappings[0].url]);
});
it("reports new candidates separately from actual new scholarships and unchanged results", () => {
  expect(
    discoveryRunSummary([
      { id: "listing", state: "success", created: 3, existing: 4, excluded: 8 },
      { id: "new", state: "auto_publish", publicationKind: "new" },
      { id: "update", state: "auto_publish", publicationKind: "updated" },
      { id: "same", state: "unchanged" },
      { id: "ambiguous", state: "review_required" },
      { id: "outage", state: "failed" },
      { id: "navigation", state: "ignored" },
    ]),
  ).toMatchObject({
    newCandidates: 3,
    knownCandidates: 4,
    excludedLinks: 8,
    newScholarships: 1,
    updatedScholarships: 1,
    unchanged: 1,
    awaitingReview: 1,
    failed: 1,
    ignored: 1,
  });
  expect(discoveryRunSummary([])).toMatchObject({ processed: 0, newScholarships: 0 });
});

it("does not turn a deadline year into an intake or a new opportunity", () => {
  const html = twenteFixture().replace("<p>For the academic year 2030/2031.</p>", "");
  const first = twenteAward(directory, twenteTestUrl, html)!;
  const next = twenteAward(directory, twenteTestUrl, html.replace("1 April 2030", "2 April 2030"))!;
  expect(first.cycle).toBe(next.cycle);
  expect(first.data.recordKind).toBe("overview");
  expect(first.data.cycleStatus).toBe("unconfirmed");
  expect(first.data.deadlineLabel).toContain("cycle and closing time need confirmation");
  const e = extractDetail(first, html);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: e.data,
      validation: e.validation,
    }).decision,
  ).toBe("auto_publish");
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: { ...e.data, availability: "open" },
      validation: e.validation,
    }).decision,
  ).toBe("review_required");
});
