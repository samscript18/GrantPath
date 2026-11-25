import { expect, it } from "vitest";
import { universityFundingFixtures } from "../fixtures/university-funding";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { resolveDetailMapping } from "../../src/server/discovery/adapter-registry";
import { extractDetail } from "../../src/server/discovery/adapters";
import { extractRegisteredDirectory } from "../../src/server/discovery/directory-adapters";
import {
  fundingProfiles,
  fundingProgrammeKey,
  jassoProgrammeName,
} from "../../src/server/discovery/university-funding";
import { canonicalDiscoveryUrl, allowedDiscoveryUrl } from "../../src/server/discovery/urls";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { robotsPolicy } from "../../src/server/monitoring/network";
import { semanticHash } from "../../src/server/scholarships/publish";
import { evaluate } from "../../src/server/eligibility/engine";
import { emptyProfile } from "../../src/server/profiles/schema";

it("keeps unknown conditions unknown across a large set of scholarship assessments", () => {
  const d = directoryDefinitions["uq-scholarships"],
    m = resolveDetailMapping(d, "https://scholarships.uq.edu.au/scholarship/large-catalogue", {
      kind: "html",
      text: universityFundingFixtures["uq-scholarships"],
    })!;
  const profile = { ...emptyProfile(), targetLevel: "master" as const, citizenships: ["Nigeria"] };
  for (let i = 0; i < 1100; i++)
    expect(evaluate(m.data.requirements, profile).outcome).toBe("potential");
});

it("extracts UBC's fact panels and holds external programmes without explicit UBC study evidence", () => {
  const d = directoryDefinitions["ubc-graduate-awards"],
    url = "https://www.grad.ubc.ca/awards/test-doctoral-fellowship";
  const html =
    '<title>The University of British Columbia</title><header class="container"><h1 class="page-title">[TEST ONLY] Doctoral Fellowship</h1></header><main><article class="node--type-award"><div class="field-content"><h4>Degree Level</h4>Doctoral</div><div class="field-content"><h4>Value</h4>$24,000 stipend plus tuition</div><div class="views-field-field-summary"><p>The award supports doctoral studies at UBC. Eligible domestic and international students require nomination and must meet the full official conditions.</p></div><h2>Eligibility</h2><p>Applicants must confirm admission, nationality and academic conditions.</p><h2>Application Procedures</h2><p>Contact the graduate programme for nomination and current closing dates.</p></article></main>';
  const m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
  expect(m.data.levels).toEqual(["doctorate"]);
  expect(extractDetail(m, html).validation.codes).toEqual([]);
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: html.replace(
        "Applicants must confirm admission, nationality and academic conditions.",
        "The lead applicant must be a UBC-V faculty member. The course is available to graduate students.",
      ),
    }),
  ).toBeUndefined();
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: html.replace("studies at UBC", "studies at an overseas institution"),
    }),
  ).toBeUndefined();
});

it("holds generic USask graduate wording and does not mistake a prior bachelor's degree for funded study", () => {
  const d = directoryDefinitions["usask-graduate-awards"],
    url =
      "https://grad.usask.ca/funding/award-search.php?award=300491GS01&category=&deadline=&department=&keyword=&type=Scholarship";
  const snapshot = (eligibility: string) =>
    `<title>University of Saskatchewan</title><main><div id="results"><h2 id="award-title">[TEST ONLY] Graduate Award</h2><table><tr><th>Eligibility:</th><td>${eligibility}</td></tr><tr><th>Value:</th><td>$3,000</td></tr><tr><th>Apply:</th><td>Confirm nomination, nationality and application requirements with the University of Saskatchewan. Closing dates and complete funding conditions require provider confirmation.</td></tr></table></div></main>`;
  const m = resolveDetailMapping(d, url, {
    kind: "html",
    text: snapshot("Students enrolled in a doctoral programme are eligible for nomination."),
  })!;
  expect(m.data.levels).toEqual(["doctorate"]);
  const eligible = snapshot(
    "Students enrolled in a doctoral programme are eligible for nomination.",
  );
  const canonical = (value: string) => `<link rel="canonical" href="${value}">${eligible}`;
  expect(
    extractDetail(m, canonical("https://grad.usask.ca/funding/award-search.php")).validation.codes,
  ).toEqual([]);
  for (const value of [
    "https://evil.test/funding/award-search.php",
    "https://grad.usask.ca/funding/unreviewed.php",
  ])
    expect(extractDetail(m, canonical(value)).validation.codes).toContain("UNSAFE_SOURCE_IDENTITY");
  for (const text of [
    "Must be a graduate student.",
    "Students enrolled in a doctoral programme must hold a bachelor's degree.",
  ])
    expect(resolveDetailMapping(d, url, { kind: "html", text: snapshot(text) })).toBeUndefined();
  expect(() => allowedDiscoveryUrl(url.replace("300491GS01", "EX5115G"), d, "detail")).toThrow();
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: snapshot("Any student enrolled in either a M.Ed. or M.C.Ed. program is eligible."),
    })?.data.levels,
  ).toEqual(["master"]);
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: snapshot("Applicants must hold a previously completed M.Ed. degree."),
    }),
  ).toBeUndefined();
});

it("unwraps only reviewed Leeds tracking links without authorising or fetching the tracking host", () => {
  const d = directoryDefinitions["leeds-scholarships"];
  const url = "https://www.leeds.ac.uk/scholarship/4/masters-scholarship-2035";
  const wrapped = `https://leeds-search.funnelback.squiz.cloud/s/redirect?url=${encodeURIComponent(url)}`;
  const html = `<title>Scholarships</title><a href="${wrapped}">Masters scholarship</a>`;
  expect(extractRegisteredDirectory(d, html, d.url).links).toEqual([url]);
  expect(() => allowedDiscoveryUrl(wrapped, d, "detail")).toThrow();
  for (const unsafe of [
    wrapped + "&url=" + encodeURIComponent(url),
    wrapped.replace("cloud/s/redirect", "cloud/unreviewed"),
    wrapped.replace(
      encodeURIComponent(url),
      encodeURIComponent("https://evil.test/scholarship/4/award"),
    ),
  ]) {
    expect(() =>
      extractRegisteredDirectory(
        d,
        `<title>Scholarships</title><a href="${unsafe}">Award</a>`,
        d.url,
      ),
    ).toThrow("DIRECTORY_NO_SUPPORTED_LINKS");
  }
});

it("preserves a reviewed award header and key-facts outside main while retaining domestic restrictions", () => {
  const d = directoryDefinitions["leeds-scholarships"];
  const url = "https://www.leeds.ac.uk/scholarship/4/masters-scholarship-2035";
  const html = `<title>University of Leeds</title><header>Unrelated navigation</header><div class="uol-course"><header class="page-heading"><h1 class="page-heading__title">[TEST ONLY] Masters scholarship 2035</h1></header><dl><dt>Study level</dt><dd>Postgraduate</dd><dt>Value</dt><dd>£5,000 tuition fee reduction</dd><dt>Fee status</dt><dd>UK</dd></dl><main><h2>Eligibility</h2><p>University of Leeds requires UK fee status, a supported Masters offer and excellent original academic results. Maintenance and accommodation are excluded.</p><h2>How to apply</h2><p>Submit an application through the official university procedure. The award cannot be transferred or deferred.</p></main></div>`;
  const mapping = resolveDetailMapping(d, url, { kind: "html", text: html })!;
  expect(mapping).toBeDefined();
  expect(mapping.data.levels).toEqual(["master"]);
  expect(mapping.data.sourceFacts?.["Fee status"]).toBe("UK");
  expect(mapping.data.sourceFacts?.officialText1).not.toContain("Unrelated navigation");
  expect(extractDetail(mapping, html).validation.codes).toEqual([]);
  expect(
    extractDetail(mapping, html.replace("UK fee status", "international fee status")).validation
      .codes,
  ).toContain("UNSUPPORTED_SECTION_CHANGE");
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: html.replace('class="page-heading"', 'class="unreviewed-header"'),
    }),
  ).toBeUndefined();
});

const routes: Record<keyof typeof universityFundingFixtures, string> = {
  "uq-scholarships": "/scholarship/research-award",
  "auckland-scholarships":
    "/en/study/scholarships-and-awards/find-a-scholarship/doctoral-award-343-all.html",
  "cambridge-funding-search": "/fund/college-studentship-2034",
  "imperial-scholarships":
    "/study/fees-and-funding/scholarships-search/doctoral-studentship-20352036.php",
  "anu-scholarships": "/scholarships/find-scholarship/restricted-award",
};
it("holds a publication when supporting funding terms change despite unchanged quoted evidence", () => {
  const definition = directoryDefinitions["anu-scholarships"];
  const html = universityFundingFixtures["anu-scholarships"];
  const mapping = resolveDetailMapping(
    definition,
    new URL(routes["anu-scholarships"], definition.url).href,
    { kind: "html", text: html },
  )!;
  const url = "https://study.anu.edu.au/reviewed-funding-terms";
  mapping.supportSections = [
    { url, selector: "main", hash: semanticHash("Tuition award. Travel is excluded.") },
  ];
  expect(
    extractDetail(mapping, html, new Date(), {
      [url]: "<main>Tuition award. Travel is excluded.</main>",
    }).validation.codes,
  ).toEqual([]);
  expect(
    extractDetail(mapping, html, new Date(), {
      [url]: "<main>Tuition award. Travel is excluded. Domestic students only.</main>",
    }).validation.codes,
  ).toContain("UNSUPPORTED_SUPPORT_SECTION_CHANGE");
  expect(extractDetail(mapping, html).validation.codes).toContain(
    "UNSUPPORTED_SUPPORT_SECTION_CHANGE",
  );
});
it("discovers only individually authorised Erasmus programme hosts as candidates", () => {
  const definition = directoryDefinitions["erasmus-mundus-catalogue"];
  const result = extractRegisteredDirectory(
    definition,
    '<h1>Erasmus Mundus Catalogue</h1><article class="ecl-card"><div class="ecl-content-block__title"><a href="https://ssi-master.eu/">Semiconductor Chips Integration and Innovation</a></div></article><article class="ecl-card"><div class="ecl-content-block__title"><a href="https://unreviewed.example/">Unreviewed programme</a></div></article>',
    definition.url,
  );
  expect(result.links).toEqual(["https://ssi-master.eu/"]);
  expect(result.leads).toMatchObject([
    { url: "https://unreviewed.example/", authorization: "unapproved" },
  ]);
  expect(() =>
    allowedDiscoveryUrl("https://ssi-master.eu/unreviewed-route", definition, "detail"),
  ).toThrow();
  expect(definition.mappings.length).toBeGreaterThanOrEqual(3);
  for (const mapping of definition.mappings) {
    expect(mapping.data.fundingType).toBe("unknown");
    expect(mapping.data.cycleStatus).toBe(mapping.cycleConfirmed ? "confirmed" : "unconfirmed");
    expect(
      (mapping.sections?.length || 0) + (mapping.supportSections?.length || 0),
    ).toBeGreaterThanOrEqual(1);
    if (mapping.cycleConfirmed)
      expect(mapping.data.evidence.some((e) => e.field === "cycle" && e.state === "verified")).toBe(
        true,
      );
  }
});
for (const id of Object.keys(
  universityFundingFixtures,
) as (keyof typeof universityFundingFixtures)[]) {
  it(`extracts and validates the reviewed ${id} CMS without inventing windows or full funding`, () => {
    const d = directoryDefinitions[id],
      url = new URL(routes[id], d.url).href,
      html = universityFundingFixtures[id];
    const m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
    expect(m).toBeDefined();
    const extraction = extractDetail(m, html);
    expect(extraction.validation.codes).toEqual([]);
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        candidate: extraction.data,
        validation: extraction.validation,
      }).decision,
    ).toBe("auto_publish");
    expect(m.data).toMatchObject({
      availability: "unknown",
      deadline: null,
      fundingType: "unknown",
    });
    expect(m.data.requirements.kind).toBe("all");
    const changed = html.replace(
      id === "cambridge-funding-search"
        ? "Application Process"
        : id === "imperial-scholarships"
          ? "Eligibility criteria"
          : id === "auckland-scholarships"
            ? "Regulations"
            : "Eligibility",
      "Unsupported layout",
    );
    expect(resolveDetailMapping(d, url, { kind: "html", text: changed })).toBeUndefined();
  });
}
it("retains domestic and fee restrictions, excludes unsupported diploma-only levels and keeps document links as unapproved evidence", () => {
  const d = directoryDefinitions["anu-scholarships"],
    url = new URL(routes["anu-scholarships"], d.url).href;
  const html = universityFundingFixtures["anu-scholarships"];
  const m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
  expect(m.data.sourceFacts?.["Student type"]).toBe("Domestic");
  expect(m.data.sourceFacts?.officialText1).toContain("Australian citizens");
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: html.replace("Undergraduate/Bachelor, Postgraduate/Masters", "Undergraduate diploma"),
    }),
  ).toBeUndefined();
  const a = directoryDefinitions["auckland-scholarships"],
    au = new URL(routes["auckland-scholarships"], a.url).href;
  expect(
    resolveDetailMapping(a, au, {
      kind: "html",
      text: universityFundingFixtures["auckland-scholarships"],
    })!.data.sourceFacts?.supportingDocuments,
  ).toContain("doctoral.pdf");
});
it("permits only the explicitly reviewed Imperial homepage canonical defect, rejecting other pages and hosts", () => {
  const d = directoryDefinitions["imperial-scholarships"],
    url = new URL(routes["imperial-scholarships"], d.url).href;
  for (const canonical of ["https://evil.test/", "https://www.imperial.ac.uk/different-award"]) {
    const html = universityFundingFixtures["imperial-scholarships"].replace(
      'href="https://www.imperial.ac.uk/"',
      `href="${canonical}"`,
    );
    const m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
    expect(extractDetail(m, html).validation.codes).toContain("UNSAFE_SOURCE_IDENTITY");
  }
});
it("canonicalises Cambridge session routes and deduplicates cycles while keeping unrelated awards distinct", () => {
  expect(
    canonicalDiscoveryUrl(
      "/fund/award-2026;jsessionid=ABC123?utm_source=test",
      "https://www.student-funding.cam.ac.uk/",
    ),
  ).toBe("https://www.student-funding.cam.ac.uk/fund/award-2026");
  const p = fundingProfiles.find((p) => p.id === "imperial-funding-cms-1")!;
  expect(fundingProgrammeKey(p, "https://www.imperial.ac.uk/award-20262027.php")).toBe(
    fundingProgrammeKey(p, "https://www.imperial.ac.uk/award-20272028.php"),
  );
  const a = fundingProfiles.find((p) => p.id === "auckland-funding-cms-1")!;
  expect(fundingProgrammeKey(a, "https://www.auckland.ac.nz/award-43-all.html")).not.toBe(
    fundingProgrammeKey(a, "https://www.auckland.ac.nz/other-award-43-all.html"),
  );
});
it("discovers programme leads without authorising arbitrary consortium hosts", () => {
  const d = directoryDefinitions["erasmus-mundus-catalogue"];
  const r = extractRegisteredDirectory(
    d,
    '<h1>Erasmus Mundus Catalogue</h1><article class="ecl-card"><div class="ecl-content-block__title"><a href="https://consortium.example/">New Joint Master</a></div></article><a class="ecl-pagination__link" href="?page=1">Next</a>',
    d.url,
  );
  expect(r.links).toEqual([]);
  expect(r.leads).toMatchObject([{ authorization: "unapproved", title: "New Joint Master" }]);
  expect(r.next).toEqual([d.url + "?page=1"]);
  expect(directoryDefinitions["anu-scholarships"].pagination).toBeUndefined();
  expect(robotsPolicy("User-agent: *\nDisallow: /*?*", "/scholarships?page=1").allowed).toBe(false);
});

it("enforces exact detail-query contracts and separates Japanese scholarship identifiers", () => {
  expect(jassoProgrammeName("Foundation award (Undergraduate)")).toBe(
    jassoProgrammeName("Foundation award [Pre-Arrival Admission]"),
  );
  const d = directoryDefinitions["jasso-scholarship-search"],
    url = "https://www.studyinjapan.go.jp/en/search-for-scholarships/detail.php?lang=en&mid=5-1234";
  expect(allowedDiscoveryUrl(url, d, "detail").href).toBe(url);
  for (const raw of [
    url + "&lang=en",
    url + "&redirect=https://evil.test",
    url.replace("lang=en", "lang=ja"),
    url.replace("mid=5-1234", "mid=abc"),
  ])
    expect(() => allowedDiscoveryUrl(raw, d, "detail")).toThrow();
  const profile = fundingProfiles.find((p) => p.id === "jasso-scholarship-cms-1")!;
  expect(fundingProgrammeKey(profile, url)).not.toBe(
    fundingProgrammeKey(profile, url.replace("5-1234", "5-5678")),
  );
  const network = directoryDefinitions["erasmus-mundus-catalogue"];
  expect(() => allowedDiscoveryUrl("https://microscom.eu/arbitrary", network, "detail")).toThrow();
});

it("extracts JASSO table values and award-level evidence without merging separate query IDs", () => {
  const d = directoryDefinitions["jasso-scholarship-search"],
    url = "https://www.studyinjapan.go.jp/en/search-for-scholarships/detail.php?lang=en&mid=5-1234";
  const html = `<main><h1 class="mainTitle">[TEST ONLY] Japanese Research Scholarship</h1><p class="school-name">Aichi Research University</p><dl><dt>Academic level:</dt><dd>Master's degree program</dd></dl><h2>Basic information</h2><table><tr><th>Amount of scholarship (yen)</th><td>：</td><td>150,000Yen</td></tr></table><h2>About recruitment</h2><p>The scholarship requires admission, academic achievement, language ability and verification of the current provider conditions.</p><p>Students must confirm the eligible regions and residence requirements with Aichi Research University before applying.</p></main>`;
  const m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
  expect(m.data.fundingSummary).toContain("150,000Yen");
  expect(m.data.levels).toEqual(["master"]);
  expect(m.provider.name).toBe("Aichi Research University");
  expect(extractDetail(m, html).validation.codes).toEqual([]);
  expect(m.cycleConfirmed).toBe(false);
});

it("extracts bounded official JSON feed links, excludes institutional funding and leaves outside hosts unapproved", () => {
  const d = directoryDefinitions["educanada-government-feed"];
  const body = JSON.stringify({
    data: [
      {
        profile: "Institution",
        program:
          '<a href="https://www.educanada.ca/scholarships-bourses/non_can/test.aspx?lang=eng">Institution grant</a>',
      },
      {
        profile: "Student/Postdoctoral Researcher",
        program:
          '<a href="https://www.educanada.ca/scholarships-bourses/non_can/award.aspx?lang=eng">Official award</a>',
      },
      {
        profile: "Student/Postdoctoral Researcher",
        program: '<a href="https://partner.example/award">Partner award</a>',
      },
    ],
  });
  const result = extractRegisteredDirectory(d, body, d.url);
  expect(result.links).toEqual([
    "https://www.educanada.ca/scholarships-bourses/non_can/award.aspx?lang=eng",
  ]);
  expect(result.leads).toMatchObject([
    { authorization: "unapproved", url: "https://partner.example/award" },
  ]);
  expect(result.excluded).toBe(1);
  expect(() => extractRegisteredDirectory(d, "{}", d.url)).toThrow("DIRECTORY_LAYOUT_CHANGED");
  expect(() => extractRegisteredDirectory(d, "{", d.url)).toThrow("DIRECTORY_JSON_INVALID");
});
