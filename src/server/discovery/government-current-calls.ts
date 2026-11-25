import * as cheerio from "cheerio";
import type { OpportunityAdapter } from "./adapter-registry";
import { scholarshipDataSchema } from "../scholarships/schema";
import { semanticHash } from "../scholarships/publish";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
export const governmentCurrentCallAdapter: OpportunityAdapter = {
  id: "official-government-call-1",
  media: ["html"],
  supports: (url) =>
    url.hostname === "cscuk.fcdo.gov.uk" &&
    url.pathname === "/scholarships/commonwealth-shared-scholarships-applications/",
  extract: (definition, url, document) => {
    if (definition.dynamicDetail !== "official-government-call-1") return;
    const $ = cheerio.load(document.text);
    $("script,style,nav,header,footer,noscript,iframe").remove();
    const root = $("article.type-cscukscholarship"),
      title = clean(root.find("h1.entry-title").text()),
      text = clean(root.text());
    const call = text.match(
      /Applications for Commonwealth Shared Scholarships for the (20\d{2})\/(\d{2}) academic year are now open\./,
    );
    const closes = text.match(
      /The closing date for applications is \d{1,2}:\d{2} GMT on (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} [A-Za-z]+ 20\d{2}\./,
    );
    if (
      root.length !== 1 ||
      title !== "Commonwealth Shared Scholarships" ||
      !call ||
      !closes ||
      +call[2] !== +call[1].slice(-2) + 1 ||
      !text.includes("Master’s courses only") ||
      !text.includes("participating UK university")
    )
      return;
    const funding = root
      .find("p,li")
      .map((_, e) => clean($(e).text()))
      .get()
      .filter(
        (p) => /^Approved tuition fees:|^Stipend \(living allowance\)/.test(p) && p.length <= 250,
      );
    if (funding.length !== 2) return;
    const passages = {
      title,
      institution: "participating UK university",
      destination: "participating UK university",
      levels: "Master’s courses only",
      cycle: call[0],
      funding: funding[0],
      living: funding[1],
    };
    const facts: Record<string, string> = { contentHash: semanticHash(text) };
    for (let n = 0; n < text.length; n += 8000)
      facts[`officialText${n / 8000 + 1}`] = text.slice(n, n + 8000);
    const data = scholarshipDataSchema.parse({
      title,
      summary:
        "Commonwealth Shared Scholarships support approved UK master’s courses for the stated academic year. Nationality or refugee status, residence, financial need, prior study and separate university admission conditions require confirmation.",
      institution: "Participating UK universities",
      destination: "United Kingdom",
      studyLocations: { scope: "institution_dependent", countries: ["GB"], institutions: [] },
      levels: ["master"],
      fields: ["Approved Commonwealth Shared Scholarship courses"],
      fundingType: "unknown",
      funding: funding.map((description) => ({
        component: "other",
        coverage: "unspecified",
        description,
      })),
      fundingSummary:
        "Approved tuition fees and a living stipend; confirm all benefits and limitations in the official call.",
      availability: "unknown",
      opensAt: null,
      deadline: null,
      deadlineState: "unknown",
      deadlineLabel: null,
      recordKind: "cycle",
      cycleStatus: "confirmed",
      officialUrl: url,
      applicationUrl: url,
      sourceFacts: facts,
      requirements: {
        kind: "all",
        id: "conditions",
        label: "Official call conditions",
        rules: [
          {
            kind: "requirement",
            id: "level",
            label: "Master’s study",
            field: "targetLevel",
            op: "in",
            values: ["master"],
            verified: true,
            evidenceKey: "levels",
          },
          {
            kind: "requirement",
            id: "confirmation",
            label:
              "Confirm all official nationality, residence, academic, financial, admission and programme-specific conditions.",
            field: "providerConfirmation",
            op: "confirmed",
            verified: false,
            evidenceKey: "requirements",
          },
        ],
      },
      evidence: [
        ...Object.entries(passages).map(([field, passage]) => ({
          field,
          passage,
          url,
          state: "verified",
          retrievedAt: new Date().toISOString(),
        })),
        ...["requirements", "availability", "deadline"].map((field) => ({
          field,
          passage:
            "Complete conditions and operational labels require validation against the official call.",
          url,
          state: "missing",
          retrievedAt: new Date().toISOString(),
        })),
      ],
    });
    return {
      key: "commonwealth-scholarships-commonwealth-shared-scholarships-applications",
      provider: {
        key: "commonwealth",
        name: "Commonwealth Scholarship Commission",
        url: "https://cscuk.fcdo.gov.uk",
        countryCode: "GB",
      },
      programme: title,
      url,
      cycle: `${call[1]}/${call[2]}`,
      cycleConfirmed: true,
      heading: title,
      requirementsComplete: false,
      data,
      passages,
      sections: [{ selector: "article.type-cscukscholarship", hash: semanticHash(text) }],
      applicationWindow: { closing: closes[0], status: call[0] },
    };
  },
};
