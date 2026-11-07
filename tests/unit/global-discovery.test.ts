import { evaluate } from "../../src/server/eligibility/engine";
import { semanticHash } from "../../src/server/scholarships/publish";
import { describe, it, expect } from "vitest";
import { countryCode, canonicalCountry } from "../../src/lib/countries";
import { scholarshipDataSchema } from "../../src/server/scholarships/schema";
import { studyLocationsOf } from "../../src/server/scholarships/locations";
import { rank } from "../../src/server/eligibility/ranking";
import { emptyProfile } from "../../src/server/profiles/schema";
import { extractDirectory, extractDetail } from "../../src/server/discovery/adapters";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { allowedDiscoveryUrl } from "../../src/server/discovery/urls";
import { discoveryFixture } from "../fixtures/discovery";
import { testScholarship } from "../fixtures/scholarship";
describe("country identity and multiple actual destinations", () => {
  it("keeps citizenship, provider and preference identity separate", () => {
    expect(countryCode("UK")).toBe("GB");
    expect(countryCode("South Korea")).toBe("KR");
    expect(canonicalCountry("TR")).toBe(canonicalCountry("Turkey"));
    const { mapping } = discoveryFixture();
    const profile = { ...emptyProfile(), destinations: ["Germany"] };
    expect(rank(profile, mapping.data, "potential").score).toBeGreaterThan(0);
    expect(
      rank({ ...profile, destinations: ["Canada"] }, mapping.data, "potential").factors,
    ).not.toContain("Preferred destination +30");
    expect(rank(profile, mapping.data, "not_eligible").excluded).toBe(true);
    expect(studyLocationsOf(testScholarship()).countries).toEqual(["GB"]);
  });
  it("rejects fictional global country tags and contradictory institution locations", () => {
    const data = testScholarship();
    expect(
      scholarshipDataSchema.safeParse({
        ...data,
        studyLocations: { scope: "global", countries: ["GLOBAL"], institutions: [] },
      }).success,
    ).toBe(false);
    expect(
      scholarshipDataSchema.safeParse({
        ...data,
        studyLocations: {
          scope: "single",
          countries: ["DE"],
          institutions: [{ name: "Institute", countryCode: "US" }],
        },
      }).success,
    ).toBe(false);
  });
});
describe("approved directory and deterministic publication", () => {
  it("compares new optional metadata against legacy records without losing undefined identity", () => {
    expect(semanticHash(undefined)).not.toBe(semanticHash(null));
    const { mapping, html } = discoveryFixture();
    const e = extractDetail(mapping, html);
    const previous = { ...mapping.data };
    delete previous.studyLocations;
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        validation: e.validation,
        candidate: e.data,
        previous,
      }).codes,
    ).toContain("UNSUPPORTED_FIELD_CHANGE");
  });
  it("deduplicates canonical links and bounds pagination to its own approved path", () => {
    const { directory, mapping } = discoveryFixture();
    const result = extractDirectory(
      directory,
      `<main><h1>Controlled directory</h1><a href="${mapping.url}?utm_source=test#section">one</a><a href="${mapping.url}">two</a><a href="https://evil.example/scholarships">bad</a><a rel="next" href="?page=2">next</a></main>`,
    );
    expect(result.links).toEqual([mapping.url]);
    expect(result.next).toEqual([directory.url + "?page=2"]);
    expect(() =>
      allowedDiscoveryUrl("https://www.ucl.ac.uk.evil.example/scholarships", directory, "detail"),
    ).toThrow();
    expect(() =>
      allowedDiscoveryUrl("https://127.0.0.1/scholarships", directory, "detail"),
    ).toThrow();
    expect(() =>
      allowedDiscoveryUrl(mapping.url + "?redirect=evil", directory, "detail"),
    ).toThrow();
  });
  it("accepts exact supported facts, rejects layout drift, missing text and missing cycle identity", () => {
    const { mapping, html } = discoveryFixture();
    const extracted = extractDetail(mapping, html);
    const policy = () =>
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        validation: extracted.validation,
        candidate: extracted.data,
      });
    expect(policy().decision).toBe("auto_publish");
    expect(
      publicationPolicy({
        enabled: false,
        autoPublish: true,
        validation: extracted.validation,
        candidate: extracted.data,
      }).codes,
    ).toContain("SOURCE_PAUSED");
    expect(
      extractDetail(mapping, html.replace("Master degree only", "Bachelor degree only")).validation
        .codes,
    ).toContain("UNSUPPORTED_SECTION_CHANGE");
    extracted.validation.cycleConfirmed = false;
    expect(policy().codes).toContain("CYCLE_UNCONFIRMED");
    expect(extractDetail(mapping, "<main><h1>Maintenance</h1></main>").validation.structure).toBe(
      false,
    );
  });
  it("preserves unknown conditions and holds removed content and false fully-funded labels", () => {
    const { mapping, html } = discoveryFixture();
    const extracted = extractDetail(mapping, html);
    extracted.validation.requirementsComplete = false;
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        validation: extracted.validation,
        candidate: extracted.data,
      }).codes,
    ).toContain("MANDATORY_CONDITIONS_UNMAPPED");
    const changed = {
      ...mapping.data,
      deadline: null,
      deadlineState: "unknown" as const,
      funding: [],
      fundingType: "unknown" as const,
    };
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        validation: { ...extracted.validation, requirementsComplete: true },
        candidate: changed,
        previous: mapping.data,
      }).codes,
    ).toContain("REMOVED_MATERIAL_CONTENT");
    expect(
      scholarshipDataSchema.safeParse({ ...mapping.data, fundingType: "comprehensive" }).success,
    ).toBe(false);
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        validation: { ...extracted.validation, requirementsComplete: true },
        candidate: mapping.data,
        previous: mapping.data,
      }).decision,
    ).toBe("unchanged");
  });
});

import { makerereAnnouncement } from "../../src/server/discovery/makerere";
it("maps previously unseen official Makerere cycles with explicit unknowns and rejects identity/layout drift", () => {
  const directory = {
    ...discoveryFixture().directory,
    dynamicDetail: "makerere-announcement-1" as const,
  };
  const url = "https://apply.mastercardfoundation.mak.ac.ug/announcements/12345";
  const html = `<main><h1>Scholarships for Masters Programmes 2028/2029</h1><p>Mastercard Foundation Scholars Program at Makerere University</p><p>Makerere University Main Campus</p></main>`;
  const mapping = makerereAnnouncement(directory, url, html)!;
  expect(mapping.cycle).toBe("2028/2029");
  expect(mapping.data.availability).toBe("unknown");
  expect(mapping.data.deadline).toBeNull();
  expect(mapping.data.fundingType).toBe("unknown");
  expect(
    evaluate(mapping.data.requirements, { ...emptyProfile(), targetLevel: "master" }).outcome,
  ).toBe("potential");
  const candidate = extractDetail(mapping, html);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      ...{ validation: candidate.validation, candidate: candidate.data },
    }).decision,
  ).toBe("auto_publish");
  expect(
    makerereAnnouncement(directory, url, html.replace("2028/2029", "2028/2030")),
  ).toBeUndefined();
  expect(
    makerereAnnouncement(
      directory,
      url,
      html.replace("Makerere University Main Campus", "Unsupported campus"),
    ),
  ).toBeUndefined();
  expect(
    makerereAnnouncement(directory, url.replace("mak.ac.ug", "example.com"), html),
  ).toBeUndefined();
});
