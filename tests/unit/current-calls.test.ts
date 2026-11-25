import { expect, it, vi } from "vitest";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { resolveDetailMapping } from "../../src/server/discovery/adapter-registry";
import { extractDetail } from "../../src/server/discovery/adapters";
import { extractRegisteredDirectory } from "../../src/server/discovery/directory-adapters";
import { universityFundingFixtures } from "../fixtures/university-funding";
import { parseApplicationInstant } from "../../src/server/discovery/application-windows";
import { publicationPolicy } from "../../src/server/discovery/policy";

export const currentRoundFixture = (opening = "1 November 2026", closing = "15 January 2027") =>
  universityFundingFixtures["uq-scholarships"].replace(
    "</dl>",
    `<dt>Applications open</dt><dd>${opening}</dd><dt>Applications close</dt><dd>${closing}</dd></dl>`,
  );
it("links explicit dated rounds to one programme without inventing an academic intake", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
  try {
    const d = directoryDefinitions["uq-scholarships"],
      url = "https://scholarships.uq.edu.au/scholarship/test-call";
    const scheme = resolveDetailMapping({ ...d, discoverApplicationRounds: false }, url, {
      kind: "html",
      text: currentRoundFixture(),
    })!;
    const round = resolveDetailMapping(d, url, { kind: "html", text: currentRoundFixture() })!;
    const next = resolveDetailMapping(d, url, {
      kind: "html",
      text: currentRoundFixture("1 February 2027", "31 March 2027"),
    })!;
    expect(round.key).toBe(scheme.key);
    expect(next.key).toBe(scheme.key);
    expect(round.cycle).not.toBe(next.cycle);
    expect(round.data.cycleBasis).toBe("application_round");
    expect(round.cycle).toBe("Application round 2026-11-01 to 2027-01-15");
    expect(extractDetail(round, currentRoundFixture()).data.availability).toBe("open");
    expect(
      extractDetail(next, currentRoundFixture("1 February 2027", "31 March 2027")).data
        .availability,
    ).toBe("upcoming");
    expect(extractDetail(scheme, currentRoundFixture()).data.availability).toBe("unknown");
  } finally {
    vi.useRealTimers();
  }
});
it("does not infer another annual call from incomplete or expired dates", () => {
  const d = directoryDefinitions["uq-scholarships"],
    url = "https://scholarships.uq.edu.au/scholarship/test-call";
  const missing = resolveDetailMapping(d, url, {
    kind: "html",
    text: currentRoundFixture("1 November", "TBC"),
  })!;
  expect(missing.cycleConfirmed).toBe(false);
  const old = resolveDetailMapping(d, url, {
    kind: "html",
    text: currentRoundFixture("1 November 2025", "15 January 2026"),
  })!;
  expect(
    extractDetail(old, currentRoundFixture("1 November 2025", "15 January 2026")).data.availability,
  ).toBe("closed");
});
it("converts only explicitly printed Helsinki times, including daylight saving", () => {
  expect(parseApplicationInstant("16.11.2026 at 8:00 am Helsinki time")).toBe(
    "2026-11-16T06:00:00.000Z",
  );
  expect(parseApplicationInstant("06.04.2027 at 8:00 am Helsinki time")).toBe(
    "2027-04-06T05:00:00.000Z",
  );
  expect(parseApplicationInstant("16.11.2026 at 8:00 am")).toBeNull();
  expect(parseApplicationInstant("31.02.2027 at 8:00 am Helsinki time")).toBeNull();
});
it("discovers scholarship announcements by reviewed routes and excludes general news", () => {
  const d = directoryDefinitions["ediss-current-calls"],
    url = "https://www.master-ediss.eu/upcoming-application-rounds-ediss-intake-7/";
  const html = `<h1>News</h1><div class="news-content"><h3><a href="${url}">Scholarship application rounds</a></h3><time datetime="2026-11-01"></time></div><div class="news-content"><h3><a href="https://www.master-ediss.eu/qa-live-webinars-2026/">General webinar</a></h3></div>`;
  expect(extractRegisteredDirectory(d, html, d.url).links).toEqual([url]);
  expect(
    resolveDetailMapping(d, url, {
      kind: "html",
      text: "<article><h1 class='entry-title'>EDISS Intake 7</h1><p>University webinar news</p></article>",
    }),
  ).toBeUndefined();
});
it("keeps changed call content and unevidenced opening changes in review", () => {
  const d = directoryDefinitions["uq-scholarships"],
    url = "https://scholarships.uq.edu.au/scholarship/test-call";
  const mapping = resolveDetailMapping(d, url, { kind: "html", text: currentRoundFixture() })!;
  const extraction = extractDetail(mapping, currentRoundFixture());
  const previous = {
    ...extraction.data,
    applicationWindow: { ...extraction.data.applicationWindow!, sourceHash: "a".repeat(64) },
  };
  const changed = {
    ...previous,
    applicationWindow: { ...previous.applicationWindow, sourceHash: "b".repeat(64) },
  };
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      validation: extraction.validation,
      candidate: changed,
      previous,
    }).codes,
  ).toContain("CALL_SOURCE_CHANGE_REQUIRES_REVIEW");
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      validation: { ...extraction.validation, matchedFields: [] },
      candidate: { ...previous, opensAt: "2026-11-01T00:00:00Z" },
      previous,
    }).codes,
  ).toContain("OPENING_SEMANTICS_UNSUPPORTED");
});

it("expires calendar-only calls conservatively without inventing a timezone or changing history", async () => {
  const { availabilityOf } = await import("../../src/server/scholarships/schema");
  const call = { availability: "open", deadline: null, windowClosesOn: "2026-11-26" };
  expect(availabilityOf(call, new Date("2026-11-25T09:59:59Z"))).toBe("open");
  expect(availabilityOf(call, new Date("2026-11-25T10:00:00Z"))).toBe("unknown");
  expect(availabilityOf(call, new Date("2026-11-27T14:00:00Z"))).toBe("closed");
  expect(
    availabilityOf({ ...call, deadline: "2026-11-26T16:00:00Z" }, new Date("2026-11-26T15:59:59Z")),
  ).toBe("open");
  expect(
    availabilityOf({ ...call, deadline: "2026-11-26T16:00:00Z" }, new Date("2026-11-26T16:00:00Z")),
  ).toBe("closed");
  expect(call.availability).toBe("open");
  expect(
    availabilityOf(
      {
        availability: "unknown",
        deadline: null,
        recordKind: "overview",
        applicationWindow: { opensOn: null, closesOn: "2020-01-01" },
      },
      new Date("2026-11-25"),
    ),
  ).toBe("unknown");
  const upcoming = {
    availability: "upcoming",
    deadline: null,
    windowOpensOn: "2026-12-01",
    windowClosesOn: "2027-01-01",
  };
  expect(availabilityOf(upcoming, new Date("2026-11-29"))).toBe("upcoming");
  expect(availabilityOf(upcoming, new Date("2026-12-01"))).toBe("unknown");
  expect(availabilityOf(upcoming, new Date("2026-12-03"))).toBe("open");
});
