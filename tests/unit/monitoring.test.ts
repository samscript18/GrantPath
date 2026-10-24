import { describe, expect, it } from "vitest";
import { extractSource, parseClosingInstant } from "../../src/server/monitoring/adapters";
import {
  isPublicAddress,
  robotsPolicy,
  validateSourceUrl,
} from "../../src/server/monitoring/network";
import { testScholarship } from "../fixtures/scholarship";
import { semanticHash } from "../../src/server/scholarships/publish";
import { uclSnapshot } from "../fixtures/source";
describe("bounded explicit official adapters", () => {
  it("detects application-link changes without guessing a new official destination or closing a cycle", () => {
    const d = testScholarship();
    const html = uclSnapshot().replace(
      "</main>",
      '<a href="/apply/first">Application portal</a></main>',
    );
    const first = extractSource("ucl-scholarship", html, d, d.officialUrl);
    const accepted = { ...first.candidate, sourceFacts: first.facts };
    const next = extractSource(
      "ucl-scholarship",
      html.replace("/apply/first", "/apply/next"),
      accepted,
      d.officialUrl,
    );
    expect(next.facts.applicationLinks).toContain("/apply/next");
    expect(next.warnings).toContainEqual(expect.stringContaining("Application links changed"));
    expect(next.candidate.applicationUrl).toBe(d.applicationUrl);
    const removed = extractSource("ucl-scholarship", uclSnapshot(), accepted, d.officialUrl);
    expect(removed.warnings).toContainEqual(expect.stringContaining("Application links changed"));
    expect(removed.candidate.availability).toBe(d.availability);
  });
  it("normalises scoped sections, detects changed study level and ignores unrelated navigation", () => {
    const d = testScholarship();
    const a = extractSource("ucl-scholarship", uclSnapshot(), d, d.officialUrl);
    const b = extractSource(
      "ucl-scholarship",
      uclSnapshot("All postgraduate taught", "Different nav"),
      d,
      d.officialUrl,
    );
    expect(semanticHash(a.facts)).toBe(semanticHash(b.facts));
    const changed = extractSource(
      "ucl-scholarship",
      uclSnapshot("All Undergraduate degrees"),
      d,
      d.officialUrl,
    );
    expect(changed.candidate.levels).toEqual(["bachelor"]);
    expect(changed.candidate.requirements.kind).toBe("all");
  });
  it("rejects layout failure instead of removing requirements", () =>
    expect(() =>
      extractSource(
        "ucl-scholarship",
        "<main><h1>UCL Global Master's Scholarship</h1><p>No expected sections.</p></main>",
        testScholarship(),
        testScholarship().officialUrl,
      ),
    ).toThrow("drift"));
  it("never guesses an instant without an explicit year, time and zone", () => {
    expect(parseClosingInstant("7 May 2026")).toBeNull();
    expect(parseClosingInstant("5pm BST, Thursday 7 May 2026")).toBe("2026-05-07T16:00:00.000Z");
    expect(parseClosingInstant("31 February 2027, 16:00 GMT")).toBeNull();
    expect(parseClosingInstant("10 December 2026, 16:59 GMT")).toBe("2026-12-10T16:59:00.000Z");
    expect(parseClosingInstant("Opens 1 May 2027; closes 7 May 2027, 5pm BST")).toBeNull();
    expect(parseClosingInstant("7 May 2027, 5pm BST or 6pm BST")).toBeNull();
  });
  it("rejects arbitrary URLs, redirects targets, private and mapped addresses", () => {
    for (const url of [
      "http://127.0.0.1/",
      "https://www.ucl.ac.uk@127.0.0.1/",
      "https://www.ucl.ac.uk:444/scholarships/ucl-global-masters-scholarship",
      "https://www.ucl.ac.uk/private",
      "https://www.ucl.ac.uk/scholarships/ucl-global-masters-scholarship?url=http://localhost",
    ])
      expect(() => validateSourceUrl(url, "ucl-scholarship")).toThrow();
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "169.254.169.254",
      "192.168.0.1",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ])
      expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);
  });
  it("honours specific agents, allow precedence, wildcard paths and crawl delay", () => {
    const txt =
      "User-agent: *\nDisallow: /private/\nCrawl-delay: 20\nAllow: /private/public\nDisallow: /*/internal/";
    expect(robotsPolicy(txt, "/private/a").allowed).toBe(false);
    expect(robotsPolicy(txt, "/private/public").allowed).toBe(true);
    expect(robotsPolicy(txt, "/en/internal/a").allowed).toBe(false);
    expect(robotsPolicy(txt, "/ok").crawlDelaySeconds).toBe(20);
    expect(
      robotsPolicy("User-agent: *\nDisallow: /\nUser-agent: GrantPath\nAllow: /", "/ok").allowed,
    ).toBe(true);
  });
});

describe("additional explicit adapter contracts", () => {
  it.each([
    [
      "oxford-clarendon",
      `<main><h1>Information for applicants</h1><p>Applicants to a new Master's or DPhil course are considered.</p><h2>Graduate application deadline</h2><p>Apply by the relevant December or January deadline.</p><h2>Value</h2><p>Full course fees and living support.</p><h2>Duration</h2><p>Course fee liability.</p></main>`,
    ],
    [
      "csc-masters",
      `<main><h1>Commonwealth Master’s Scholarships</h1><p>For full-time taught Master’s study.</p><p>Applications are now closed.</p><p>The closing date for applications was 20 October 2026, 16:00 BST.</p><h2>Applicant eligibility</h2><ul><li>Permanent eligible-country residence.</li><li>Required qualification.</li></ul><h2>Financial assistance</h2><p>Approved tuition and stipend.</p><h2>General conditions</h2></main>`,
    ],
    [
      "twente-uts",
      `<main><h1>University of Twente Scholarship (UTS)</h1><p>Students applying for a graduate programme (MSc).</p><h2>Scholarship value</h2><p>€3,000–€22,000.</p><h2>Application requirements</h2><ul><li>Provisional admission.</li><li>Overseas eligibility.</li></ul><h2>Application deadlines & details</h2><p>Application forms closes per 1 April 2027, 16.00 CET.</p></main>`,
    ],
  ])("extracts bounded, scoped facts for %s", (adapter, html) => {
    const result = extractSource(
      adapter,
      html,
      testScholarship(),
      "https://www.ucl.ac.uk/scholarships/test-fixture",
    );
    expect(result.facts.levels).not.toBe("");
    expect(result.facts.funding).not.toBe("");
    expect(result.facts.requirements).not.toBe("");
    expect(result.candidate.sourceFacts).toEqual(result.facts);
  });
  it("ignores reordering a flat conjunction list", () => {
    const a = uclSnapshot();
    const b = a.replace(
      "<li>Complete admission application.</li><li>Overseas fee status.</li>",
      "<li>Overseas fee status.</li><li>Complete admission application.</li>",
    );
    expect(
      extractSource("ucl-scholarship", a, testScholarship(), testScholarship().officialUrl).facts,
    ).toEqual(
      extractSource("ucl-scholarship", b, testScholarship(), testScholarship().officialUrl).facts,
    );
  });
});
