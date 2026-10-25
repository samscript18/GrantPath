import * as cheerio from "cheerio";
import type { DetailMapping, DirectoryDefinition } from "./types";
import { scholarshipDataSchema } from "@/server/scholarships/schema";

// An explicit official template contract, not a generic web/AI extractor.
// Previously unseen announcement URLs/cycles can be published with uncertainty;
// unsupported provider identity or headline grammar stays in exception review.
export function makerereAnnouncement(
  definition: DirectoryDefinition,
  url: string,
  html: string,
): DetailMapping | undefined {
  if (definition.dynamicDetail !== "makerere-announcement-1") return;
  const location = new URL(url);
  if (
    location.hostname !== "apply.mastercardfoundation.mak.ac.ug" ||
    !/^\/announcements\/\d+\/?$/.test(location.pathname)
  )
    return;
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript").remove();
  const root = $("main").length ? $("main").first() : $("body");
  const normal = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
  const text = normal(root.text());
  const heading = root
    .find("h1,h2,h3")
    .map((_, el) => normal($(el).text()))
    .get()
    .find((s) => /^Scholarships for (Masters|Undergraduate) Programmes 20\d{2}\/20\d{2}$/.test(s));
  if (
    !heading ||
    !text.includes("Mastercard Foundation Scholars Program at Makerere University") ||
    !text.includes("Makerere University Main Campus")
  )
    return;
  const years = heading.match(/(20\d{2})\/(20\d{2})$/)!;
  if (Number(years[2]) !== Number(years[1]) + 1) return;
  const level = heading.includes("Masters") ? "master" : "bachelor";
  const cycle = `${years[1]}/${years[2]}`;
  const programme =
    level === "master"
      ? "Makerere Mastercard Foundation — master's scholarships"
      : "Makerere Mastercard Foundation — undergraduate scholarships";
  const passages = {
    title: "Mastercard Foundation Scholars Program at Makerere University",
    destination: "Makerere University Main Campus",
    institution: "Makerere University",
    levels: heading,
    cycle,
  };
  const evidence = Object.entries(passages).map(([field, passage]) => ({
    field,
    passage,
    url,
    state: "verified" as const,
    retrievedAt: new Date().toISOString(),
  }));
  const data = scholarshipDataSchema.parse({
    title: programme,
    summary:
      "Official Makerere announcement for this academic cycle. Confirm category, citizenship, admission, academic, financial and other provider conditions before applying. The application window and complete funding package are not yet confirmed here.",
    destination: "Uganda",
    studyLocations: {
      scope: "single",
      countries: ["UG"],
      institutions: [{ name: "Makerere University main campus", countryCode: "UG" }],
    },
    institution: "Makerere University main campus",
    levels: [level],
    fields: ["Provider-approved fields (confirmation needed)"],
    fundingType: "unknown",
    funding: [],
    fundingSummary:
      "Funding components and exclusions need confirmation against the official call.",
    availability: "unknown",
    opensAt: null,
    deadline: null,
    deadlineState: "unknown",
    deadlineLabel: "Confirm the scholarship closing date and application window with Makerere.",
    officialUrl: url,
    applicationUrl: url,
    recordKind: "cycle",
    cycleStatus: "confirmed",
    requirements: {
      kind: "all",
      id: "official-requirements",
      label: "Provider conditions",
      rules: [
        {
          kind: "requirement",
          id: "target-level",
          label: "Intended study level stated in the official call",
          field: "targetLevel",
          op: "in",
          values: [level],
          verified: true,
          evidenceKey: "levels",
        },
        {
          kind: "requirement",
          id: "unmapped-provider-conditions",
          label:
            "Confirm all category, nationality, admission, financial and academic conditions against the official call.",
          field: "providerConfirmation",
          op: "confirmed",
          verified: false,
          evidenceKey: "requirements",
        },
      ],
    },
    evidence: [
      ...evidence,
      ...["requirements", "funding", "availability", "deadline"].map((field) => ({
        field,
        passage:
          "This template does not establish complete conditions, funding components or application dates; provider confirmation is required.",
        url,
        state: "missing",
        retrievedAt: new Date().toISOString(),
      })),
    ],
  });
  return {
    key: level === "master" ? "makerere-mastercard-masters" : "makerere-mastercard-undergraduate",
    provider: {
      key: "makerere",
      name: "Makerere University",
      url: "https://www.mak.ac.ug",
      countryCode: "UG",
    },
    programme,
    url,
    cycle,
    cycleConfirmed: true,
    heading,
    passages,
    requirementsComplete: false,
    data,
  };
}
