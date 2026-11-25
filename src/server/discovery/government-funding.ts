import * as cheerio from "cheerio";
import type { OpportunityAdapter } from "./adapter-registry";
import type { DetailMapping } from "./types";
import { scholarshipDataSchema } from "../scholarships/schema";
import { semanticHash } from "../scholarships/publish";
import { canonicalCountry } from "../../lib/countries";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
export const governmentFundingAdapters: OpportunityAdapter[] = [
  {
    id: "educanada-mobility-1",
    media: ["html"],
    supports: (url) =>
      url.hostname === "www.educanada.ca" &&
      /^\/scholarships-bourses\/can\/institutions\/(?:elap-pfla|seed-bpeed|study-in-canada-sep-etudes-au-canada-pct)\.aspx$/.test(
        url.pathname,
      ),
    extract: (definition, url, document) => {
      if (
        definition.dynamicDetail !== "educanada-mobility-1" ||
        Buffer.byteLength(document.text) > 2_000_000
      )
        return;
      const $ = cheerio.load(document.text);
      $("script,style,nav,header,footer,noscript,iframe").remove();
      const root = $("main"),
        title = clean(root.find("h1").text()),
        text = clean(root.text());
      const isSeed = url.includes("/seed-bpeed.aspx");
      const expected = isSeed
        ? "Scholarships and Educational Exchanges for Development – Phase 2 (SEED-2)"
        : url.includes("elap-pfla")
          ? "Emerging Leaders in the Americas Program"
          : "Study in Canada Scholarships";
      if (
        root.length !== 1 ||
        title !== expected ||
        !(
          isSeed
            ? [
                "Eligible expenses",
                "How funding works",
                "Application instructions for Canadian institutions",
                "Application deadline",
              ]
            : ["Objectives", "Scholarship project scope and requirements", "Application deadline"]
        ).every((h) =>
          root
            .find("h2,h3,h4")
            .toArray()
            .some((e) => clean($(e).text()) === h),
        )
      )
        return;
      const seedCycle = isSeed
        ? text.match(/Application period for (20\d{2})-(\d{2}) is closed\./)
        : null;
      const cycle =
        isSeed && seedCycle
          ? [seedCycle[0], seedCycle[1], seedCycle[1].slice(0, 2) + seedCycle[2]]
          : text.match(/Program Delivery Model Update\s*-\s*Effective (20\d{2})-(20\d{2}) cycle/);
      if (
        !cycle ||
        +cycle[2] !== +cycle[1] + 1 ||
        !text.includes(
          isSeed
            ? "Canadian institutions must apply on behalf of eligible candidates."
            : "Direct applications from individuals are not accepted.",
        )
      )
        return;
      const institution = "Canadian post-secondary institutions";
      const level = text.match(/graduate level \(Masters and PhD\)/)?.[0];
      const undergraduate = text.match(/(?:college of|college or) undergraduate level/)?.[0];
      const funding = root
        .find(isSeed ? "tr" : "p,li")
        .map((_, e) => clean($(e).text()))
        .get()
        .filter(
          (p) =>
            (isSeed
              ? /^(?:College \/ undergraduate|Graduate)\(/.test(p) && /\$[\d,]+/.test(p)
              : /^\$(?:10,200|14,000|8,600|12,400) for/.test(p)) && p.length <= 250,
        );
      if (
        !level ||
        !undergraduate ||
        funding.length < 2 ||
        !text.includes(institution) ||
        !text.includes("Global Affairs Canada")
      )
        return;
      const closedPassage =
        seedCycle?.[0] ||
        (text.includes("The application period is now closed.")
          ? "The application period is now closed."
          : undefined);
      const closed = !!closedPassage;
      const passages: Record<string, string> = {
        title,
        institution,
        destination: institution,
        levels: level,
        cycle: cycle[0],
        funding: funding[0],
        ...(closedPassage ? { availability: closedPassage } : {}),
      };
      const facts: Record<string, string> = {
        applicationRoute:
          "Canadian institutions select and nominate students; students cannot apply directly to this call.",
        mobilityScope: "Short-term study or research exchange, not a full-degree funding promise.",
      };
      const nationality = root
        .find("li")
        .filter((_, el) =>
          [
            "Citizens of the following eligible countries/territories:",
            "citizens of a country listed below:",
          ].some((prefix) =>
            clean($(el).clone().children("ul").remove().end().text())
              .replace(/^✔\s*/, "")
              .startsWith(prefix),
          ),
        )
        .first();
      const countryLabels = nationality
        .children("ul")
        .children("li")
        .map((_, el) => {
          const item = $(el).clone();
          item.find("b,strong").remove();
          return clean(item.text()).replace(/[;.]+$/, "");
        })
        .get()
        .flatMap((item) =>
          item
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean),
        );
      const recognised = countryLabels.map((name) =>
        canonicalCountry(
          name === "Laos (Lao People’s Democratic Republic (Lao PDR))"
            ? "Laos"
            : name === "The Philippines"
              ? "Philippines"
              : name === "Brunei Darussalam"
                ? "BN"
                : name === "Myanmar"
                  ? "MM"
                  : name,
        ),
      );
      const eligibleCitizenships =
        countryLabels.length && recognised.every(Boolean)
          ? [...new Set(recognised as string[])]
          : [];
      if (eligibleCitizenships.length) {
        passages["citizenships"] = clean(nationality.text());
        facts.eligibleCitizenships = eligibleCitizenships.join("; ");
      }
      for (let i = 0; i < text.length; i += 8000)
        facts[`officialText${i / 8000 + 1}`] = text.slice(i, i + 8000);
      const evidence = Object.entries(passages).map(([field, passage]) => ({
        field,
        passage,
        url,
        state: "verified",
        retrievedAt: new Date().toISOString(),
      }));
      evidence.push({
        field: "levels",
        passage: undergraduate,
        url,
        state: "verified",
        retrievedAt: new Date().toISOString(),
      });
      for (const passage of funding.slice(1))
        evidence.push({
          field: "funding",
          passage,
          url,
          state: "verified",
          retrievedAt: new Date().toISOString(),
        });
      const data = scholarshipDataSchema.parse({
        title,
        summary: `${title} supports short-term inbound study or research mobility. Canadian institutions select and nominate students; individuals cannot apply directly. Eligible nationalities, current enrolment, competing funding and institutional conditions must be confirmed.`,
        institution,
        destination: "Canada",
        studyLocations: { scope: "participating", countries: ["CA"], institutions: [] },
        levels: ["bachelor", "master", "doctorate"],
        fields: ["Eligible exchange study or research; confirm with the host institution"],
        fundingType: "unknown",
        funding: funding
          .slice(0, 10)
          .map((description) => ({ component: "other", coverage: "unspecified", description })),
        fundingSummary: funding.slice(0, 2).join(" ").slice(0, 300),
        availability: closed ? "closed" : "unknown",
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
          id: "official-conditions",
          label: "Official mobility award conditions",
          rules: [
            ...(eligibleCitizenships.length
              ? [
                  {
                    kind: "requirement",
                    id: "eligible-citizenships",
                    label: "Citizenship in an explicitly listed eligible country or territory",
                    field: "citizenships",
                    op: "in",
                    values: eligibleCitizenships,
                    verified: true,
                    evidenceKey: "citizenships",
                  },
                ]
              : []),
            {
              kind: "requirement",
              id: "level",
              label: "Supported study level",
              field: "targetLevel",
              op: "in",
              values: ["bachelor", "master", "doctorate"],
              verified: true,
              evidenceKey: "levels",
            },
            {
              kind: "requirement",
              id: "provider-confirmation",
              label:
                "Confirm nationality, full-time enrolment, institutional nomination, competing funding restrictions and all retained official conditions. This award funds short-term mobility.",
              field: "providerConfirmation",
              op: "confirmed",
              verified: false,
              evidenceKey: "requirements",
            },
          ],
        },
        evidence: [
          ...evidence,
          ...(!closed
            ? [
                {
                  field: "availability",
                  passage: "Current application availability requires provider confirmation.",
                  url,
                  state: "missing",
                  retrievedAt: new Date().toISOString(),
                },
              ]
            : []),
          {
            field: "requirements",
            passage:
              "Complete applicant restrictions require confirmation against the retained official guidance.",
            url,
            state: "missing",
            retrievedAt: new Date().toISOString(),
          },
        ],
      });
      return {
        key: isSeed
          ? "educanada-seed-phase-2-mobility"
          : url.includes("elap-pfla")
            ? "educanada-elap-mobility"
            : "educanada-study-in-canada-mobility",
        provider: {
          key: "global-affairs-canada",
          name: "Global Affairs Canada",
          url: "https://www.educanada.ca",
          countryCode: "CA",
        },
        programme: title,
        url,
        cycle: `${cycle[1]}/${seedCycle ? seedCycle[2] : cycle[2]}`,
        cycleConfirmed: true,
        heading: title,
        requirementsComplete: false,
        data,
        passages,
        sections: [{ selector: "main", hash: semanticHash(text) }],
      } satisfies DetailMapping;
    },
  },
];
