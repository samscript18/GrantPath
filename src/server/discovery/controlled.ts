// Fictional records and snapshots for explicit, isolated release verification only.
// Never enabled on a database whose name is not an isolated test database.
import type { DirectoryDefinition } from "./types";
import { semanticHash } from "@/server/scholarships/publish";
export function controlledFixturesEnabled() {
  if (process.env.ENABLE_CONTROLLED_FIXTURES !== "1" || !process.env.DATABASE_URL) return false;
  try {
    return /(?:^|[_-])test(?:[_-]|$)/i.test(new URL(process.env.DATABASE_URL).pathname.slice(1));
  } catch {
    return false;
  }
}
export const controlledDirectory: DirectoryDefinition = {
  id: "controlled-release",
  url: "https://www.ucl.ac.uk/scholarships/controlled-release-directory",
  heading: "[TEST ONLY] Controlled directory",
  linkSelector: "main a[href]",
  allowedDetails: [
    { host: "www.ucl.ac.uk", pathPrefix: "/scholarships/controlled-release-detail" },
  ],
  mappings: [
    {
      key: "test-release-joint-programme",
      programme: "[TEST ONLY] Controlled joint scholarship",
      provider: {
        key: "test-release-provider",
        name: "[TEST ONLY] Controlled provider",
        url: "https://www.ucl.ac.uk",
        countryCode: "GB",
      },
      url: "https://www.ucl.ac.uk/scholarships/controlled-release-detail",
      cycle: "TEST 2027",
      cycleConfirmed: true,
      heading: "[TEST ONLY] Controlled joint scholarship",
      requirementsComplete: true,
      sections: [
        {
          selector: "#conditions",
          hash: semanticHash("[TEST ONLY] The stated target level is the only fixture condition."),
        },
      ],
      levelSelector: "#level",
      levelRuleId: "fixture-level",
      passages: {
        title: "[TEST ONLY] Controlled joint scholarship",
        destination: "United Kingdom and Germany",
        institution: "[TEST ONLY] Joint institution",
        levels: "master",
        cycle: "TEST 2027",
      },
      data: {
        title: "[TEST ONLY] Controlled joint scholarship",
        summary:
          "Fictional scholarship used exclusively for isolated release verification. This is not an actual scholarship or a real provider offer.",
        destination: "United Kingdom · Germany",
        studyLocations: {
          scope: "multiple",
          countries: ["GB", "DE"],
          institutions: [
            { name: "[TEST ONLY] Joint institution", countryCode: "GB" },
            { name: "[TEST ONLY] German institution", countryCode: "DE" },
          ],
        },
        institution: "[TEST ONLY] Joint institution",
        levels: ["master"],
        fields: ["Computer Science"],
        fundingType: "unknown",
        funding: [],
        fundingSummary: "No real funding is offered by this test fixture.",
        availability: "unknown",
        opensAt: null,
        deadline: null,
        deadlineLabel: null,
        deadlineState: "unknown",
        officialUrl: "https://www.ucl.ac.uk/scholarships/controlled-release-detail",
        applicationUrl: "https://www.ucl.ac.uk/scholarships/controlled-release-detail",
        recordKind: "cycle",
        cycleStatus: "confirmed",
        requirements: {
          kind: "all",
          id: "fixture-all",
          label: "Isolated fixture conditions",
          rules: [
            {
              kind: "requirement",
              id: "fixture-level",
              label: "Fixture requires the stated intended level",
              field: "targetLevel",
              op: "in",
              values: ["master"],
              verified: true,
              evidenceKey: "levels",
            },
          ],
        },
        evidence: [
          "title",
          "destination",
          "institution",
          "levels",
          "cycle",
          "funding",
          "availability",
        ].map((field) => ({
          field,
          url: "https://www.ucl.ac.uk/scholarships/controlled-release-detail",
          passage:
            (
              {
                title: "[TEST ONLY] Controlled joint scholarship",
                destination: "United Kingdom and Germany",
                institution: "[TEST ONLY] Joint institution",
                levels: "master",
                cycle: "TEST 2027",
              } as Record<string, string>
            )[field] || "No real funding or application window is offered.",
          state: ["funding", "availability"].includes(field) ? "missing" : "verified",
          retrievedAt: "2026-10-25T08:00:00.000Z",
        })),
      },
    },
  ],
};
export function controlledSnapshot(mode: "valid" | "changed" | "ambiguous") {
  return `<main><h1>[TEST ONLY] Controlled joint scholarship</h1><p>United Kingdom and Germany</p><p>[TEST ONLY] Joint institution</p><p>TEST 2027</p><div id="conditions">[TEST ONLY] The stated target level is the only fixture condition.</div><p id="level">${mode === "valid" ? "master" : mode === "changed" ? "bachelor" : "master or perhaps another qualification; provider confirmation required"}</p></main>`;
}

// A distinct unresolved candidate verifies that ambiguous new records stay unpublished.
const unresolved = structuredClone(controlledDirectory.mappings[0]);
unresolved.key = "test-release-unresolved-programme";
unresolved.url += "/unresolved";
unresolved.programme = "[TEST ONLY] Unresolved source scholarship";
unresolved.heading = "[TEST ONLY] Unresolved source scholarship";
unresolved.data.title = unresolved.programme;
unresolved.data.officialUrl = unresolved.url;
unresolved.data.applicationUrl = unresolved.url;
unresolved.passages.title = unresolved.programme;
unresolved.data.evidence = unresolved.data.evidence.map((e) => ({
  ...e,
  url: unresolved.url,
  ...(e.field === "title" ? { passage: unresolved.programme } : {}),
}));
controlledDirectory.mappings.push(unresolved);
const changedScenario = structuredClone(controlledDirectory.mappings[0]);
changedScenario.key = "test-release-change-programme";
changedScenario.url += "/change";
changedScenario.programme = "[TEST ONLY] Controlled change scholarship";
changedScenario.heading = changedScenario.programme;
changedScenario.data.title = changedScenario.programme;
changedScenario.data.officialUrl = changedScenario.url;
changedScenario.data.applicationUrl = changedScenario.url;
changedScenario.passages.title = changedScenario.programme;
changedScenario.data.evidence = changedScenario.data.evidence.map((e) => ({
  ...e,
  url: changedScenario.url,
  ...(e.field === "title" ? { passage: changedScenario.programme } : {}),
}));
controlledDirectory.mappings.push(changedScenario);
