import { expect, it } from "vitest";
import {
  interpretApplicationWindow,
  parseOfficialDate,
  enrichApplicationWindow,
} from "../../src/server/discovery/application-windows";
import { testScholarship } from "../fixtures/scholarship";
import { extractDetail } from "../../src/server/discovery/adapters";
import { semanticHash } from "../../src/server/scholarships/publish";
import type { DetailMapping } from "../../src/server/discovery/types";
const now = new Date("2026-11-25T10:00:00Z");
it("parses reviewed day-first and English date forms without guessing missing years or invalid dates", () => {
  expect(parseOfficialDate("04/01/2026")).toBeNull();
  expect(parseOfficialDate("04/01/2026", true)).toBe("2026-01-04");
  expect(parseOfficialDate("30 Mar 2027")).toBe("2027-03-30");
  expect(parseOfficialDate("17th January 2027")).toBe("2027-01-17");
  for (const text of [
    "29 February 2027",
    "31/04/2027",
    "15 January",
    "January 2027",
    "2027-13-01",
    "31 January 2027 or 28 February 2027",
  ])
    expect(parseOfficialDate(text, true)).toBeNull();
});
it("resolves confirmed historic cycles without inventing a closing instant or next intake", () => {
  const result = interpretApplicationWindow({ closing: "20/11/2026", dayFirst: true }, true, now);
  expect(result).toMatchObject({ availability: "closed", closesOn: "2026-11-20", instant: null });
  expect(
    interpretApplicationWindow({ closing: "20/11/2026", dayFirst: true }, false, now).availability,
  ).toBe("unknown");
  expect(interpretApplicationWindow({ closing: "25 November 2026" }, true, now).availability).toBe(
    "unknown",
  );
});
it("uses conservative civil-date bounds and requires an opening or explicit open statement", () => {
  expect(
    interpretApplicationWindow(
      { opening: "1 December 2026", closing: "31 January 2027" },
      true,
      now,
    ).availability,
  ).toBe("upcoming");
  expect(
    interpretApplicationWindow(
      { opening: "1 November 2026", closing: "31 January 2027" },
      true,
      now,
    ).availability,
  ).toBe("open");
  expect(interpretApplicationWindow({ closing: "31 January 2027" }, true, now).availability).toBe(
    "unknown",
  );
  expect(
    interpretApplicationWindow(
      { opening: "1 February 2027", closing: "31 January 2027" },
      true,
      now,
    ).conflicting,
  ).toBe(true);
});
it("distinguishes unannounced and rolling schemes without asserting current open eligibility", () => {
  expect(interpretApplicationWindow({ closing: "TBC" }, false, now)).toMatchObject({
    kind: "unannounced",
    availability: "unknown",
  });
  expect(
    interpretApplicationWindow({ mode: "Applications accepted at any time" }, false, now),
  ).toMatchObject({ kind: "rolling", availability: "unknown" });
  expect(
    interpretApplicationWindow({ mode: "EOIs are accepted year-round" }, false, now).kind,
  ).toBe("unknown");
});
it("validates a supporting page's exact window evidence and rejects its absence or drift", () => {
  const data = testScholarship();
  Object.assign(data, {
    recordKind: "cycle",
    cycleStatus: "confirmed",
    availability: "unknown",
    deadline: null,
    deadlineState: "unknown",
    deadlineLabel: null,
  });
  const html =
    "<main><h1>Test scholarship</h1><p>[TEST ONLY] Provider offers a master in the United Kingdom for 2027.</p></main>";
  const url = "https://www.ucl.ac.uk/scholarships/test-fixture",
    support = url + "/dates";
  const text = "Applications open 1 November 2026 and close 31 January 2027.";
  const m: DetailMapping = {
    key: "test-window",
    url,
    provider: { key: "test", name: "[TEST ONLY] Provider", url },
    programme: data.title,
    cycle: "2027",
    cycleConfirmed: true,
    heading: "Test scholarship",
    data,
    requirementsComplete: false,
    passages: { cycle: "2027" },
    supportPages: [support],
    supportSections: [{ url: support, selector: "main", hash: semanticHash(text) }],
    applicationWindow: { url: support, opening: "1 November 2026", closing: "31 January 2027" },
  };
  const x = extractDetail(m, html, now, { [support]: `<main>${text}</main>` });
  expect(x.data.availability).toBe("open");
  expect(x.data.deadline).toBeNull();
  expect(x.data.deadlineState).toBe("date_only");
  expect(x.validation.codes).toEqual([]);
  expect(x.data.evidence.find((e) => e.field === "applicationWindow")?.url).toBe(support);
  expect(extractDetail(m, html, now).validation.codes).toContain(
    "APPLICATION_WINDOW_EVIDENCE_MISSING",
  );
  expect(
    extractDetail(m, html, now, { [support]: "<main>Applications postponed.</main>" }).validation
      .codes,
  ).toContain("UNSUPPORTED_SUPPORT_SECTION_CHANGE");
});
it("preserves unknown funding and eligibility during window-only enrichment", () => {
  const old = testScholarship();
  const next = enrichApplicationWindow(
    old,
    { closing: "1 January 2026" },
    old.officialUrl,
    true,
    now,
  );
  expect(next.requirements).toEqual(old.requirements);
  expect(next.funding).toEqual(old.funding);
  // Previously accepted exact closing times cannot be silently replaced by an
  // extracted date-only label through the publication policy.
  expect(next.deadline).toBe(old.deadline);
});

it("excludes only explicitly reviewed contact forms while continuing to detect changed award conditions", () => {
  const html =
    "<main><h1>Test scholarship</h1><p>Applicants must meet the official conditions.</p><form>Random contact widget label A</form></main>";
  const mapping: DetailMapping = {
    key: "contact-test",
    programme: "Test scholarship",
    provider: { key: "test", name: "Test", url: "https://example.test" },
    url: "https://example.test/award",
    heading: "Test scholarship",
    cycle: "Overview",
    cycleConfirmed: false,
    requirementsComplete: false,
    data: testScholarship(),
    passages: {},
    ignoredSelectors: ["form"],
    sections: [
      {
        selector: "main",
        hash: semanticHash("Test scholarshipApplicants must meet the official conditions."),
      },
    ],
  };
  expect(extractDetail(mapping, html.replace("label A", "label B")).validation.codes).toEqual([]);
  expect(
    extractDetail(
      mapping,
      html.replace("meet the official conditions", "be Canadian citizens only"),
    ).validation.codes,
  ).toContain("UNSUPPORTED_SECTION_CHANGE");
});
