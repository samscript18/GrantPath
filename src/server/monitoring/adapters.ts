import * as cheerio from "cheerio";
import { z } from "zod";
import { supportedSources } from "./network";
import { scholarshipDataSchema, type ScholarshipData } from "@/server/scholarships/schema";
import type { Rule } from "@/server/eligibility/rules";
export type Extracted = {
  candidate: ScholarshipData;
  facts: Record<string, string>;
  warnings: string[];
  excerpt: string;
};
const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
export function parseClosingInstant(text: string): string | null {
  const date = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  const time =
    text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\s*(GMT|BST|UTC|CET|CEST)\b/i) ||
    text.match(/\b(\d{1,2})[:.](\d{2})\s*()(GMT|BST|UTC|CET|CEST)\b/i);
  if (!date || !time) return null;
  let hour = Number(time[1]);
  const minute = Number(time[2] || 0);
  const period = time[3].toLowerCase();
  if (period && (hour < 1 || hour > 12)) return null;
  if (period) hour = (hour % 12) + (period === "pm" ? 12 : 0);
  if (hour > 23 || minute > 59) return null;
  const month = months.indexOf(date[2].toLowerCase());
  const day = Number(date[1]);
  const year = Number(date[3]);
  if (new Date(Date.UTC(year, month, day)).getUTCDate() !== day) return null;
  const offset = ({ GMT: 0, UTC: 0, BST: 60, CET: 60, CEST: 120 } as Record<string, number>)[
    time[4].toUpperCase()
  ];
  return new Date(Date.UTC(year, month, day, hour, minute) - offset * 60000).toISOString();
}
export function extractSource(
  adapter: string,
  html: string,
  accepted: ScholarshipData,
  sourceUrl: string,
  now = new Date(),
): Extracted {
  if (!supportedSources[adapter]) throw new Error("Unknown source adapter.");
  if (html.length > 2_000_000) throw new Error("Snapshot exceeds the adapter input limit.");
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe").remove();
  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");
  const heading = root.find("h1").first().text().replace(/\s+/g, " ").trim();
  const expected = {
    "ucl-scholarship": /UCL Global.*Scholarship/i,
    "oxford-clarendon": /Information for applicants|Clarendon/i,
    "csc-masters": /Commonwealth.*Master/i,
    "twente-uts": /University of Twente Scholarship/i,
  }[adapter];
  if (!expected || !expected.test(heading))
    throw new Error("Adapter drift: expected scholarship heading is missing.");
  const lines: string[] = [];
  root.find("h1,h2,h3,p,li,td,dt,dd").each((_, el) => {
    const line = $(el).text().replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
  });
  const text = lines.join("\n");
  const section = (pattern: RegExp) => {
    const h = root
      .find("h2,h3")
      .filter((_, el) => pattern.test($(el).text()))
      .first();
    if (!h.length) return "";
    return h
      .nextUntil("h1,h2,h3")
      .toArray()
      .map((el) => {
        const node = $(el);
        if (node.is("ul,ol"))
          return node
            .children("li")
            .toArray()
            .map((li) => $(li).text().replace(/\s+/g, " ").trim())
            .sort()
            .join(" | ");
        return node.text().replace(/\s+/g, " ").trim();
      })
      .join(" ")
      .trim()
      .slice(0, 5000);
  };
  const pick = (pattern: RegExp) => text.match(pattern)?.[1]?.trim().slice(0, 5000) || "";
  const facts: Record<string, string> = {};
  if (adapter === "ucl-scholarship") {
    facts.levels = pick(/Eligible programmes:\s*(.*?)(?=Deadline:|\n|$)/i);
    facts.funding = pick(
      /Value:\s*(.*?)(?=Available to:|Selection criteria:|Eligible fee status:|Eligible programmes:|Deadline:|\n|$)/i,
    );
    facts.requirements = section(/^Eligibility$/i);
    facts.deadline = pick(/Deadline:\s*([^\n]+)/i);
  } else if (adapter === "oxford-clarendon") {
    facts.levels = pick(/(new Master['’]s or DPhil course[^\n]*)/i);
    facts.funding = section(/^Value$/i);
    facts.requirements =
      section(/^Graduate application deadline$/i) || pick(/(If you apply[^\n]+)/i);
    facts.deadline = pick(/(December or January[^\n]*)/i);
  } else if (adapter === "csc-masters") {
    facts.levels = pick(/(full-time taught Master[^\n]*)/i);
    facts.funding = section(/^Financial assistance$/i);
    facts.requirements = section(/^Applicant eligibility$/i);
    facts.deadline = pick(/(The closing date for applications[^\n]*)/i);
  } else {
    facts.levels = pick(/(applying for a graduate programme[^\n]*)/i);
    facts.funding = section(/^Scholarship value$/i);
    facts.requirements = section(/^Application requirements$/i);
    facts.deadline = pick(/(Application forms closes[^\n]*)/i);
  }
  facts.status = /applications[^\n]{0,100}(?:are now closed|are closed)/i.test(text)
    ? "closed"
    : /applications[^\n]{0,50}(?:are now open|are open)/i.test(text)
      ? "open"
      : "unknown";
  const normal = (v: string) => v.replace(/\s+/g, " ").trim();
  Object.keys(facts).forEach((k) => {
    facts[k] = normal(facts[k]);
  });
  if (!facts.levels || !facts.requirements || !facts.funding)
    throw new Error(
      "Adapter drift: one or more required scoped sections could not be extracted. Accepted requirements are preserved.",
    );
  const candidate = structuredClone(accepted);
  const warnings: string[] = [];
  candidate.sourceFacts = facts;
  const previous = accepted.sourceFacts;
  const evidence = (
    field: string,
    passage: string,
    state: "missing" | "conflicting" = "missing",
  ) => {
    candidate.evidence = candidate.evidence.filter((e) => e.field !== field);
    candidate.evidence.push({
      field,
      url: sourceUrl,
      passage: passage.slice(0, 1000),
      state,
      retrievedAt: now.toISOString(),
    });
  };
  for (const [field, value] of Object.entries(facts)) if (value) evidence(`source.${field}`, value);
  if (adapter === "ucl-scholarship") {
    const levels: ScholarshipData["levels"] | null = /undergraduate/i.test(facts.levels)
      ? ["bachelor"]
      : /postgraduate taught|master/i.test(facts.levels)
        ? ["master"]
        : /postgraduate research|doctoral/i.test(facts.levels)
          ? ["doctorate"]
          : null;
    if (!levels) {
      warnings.push("Unrecognised eligible-programme wording: confirm the intended level.");
    } else if (JSON.stringify(levels) !== JSON.stringify(candidate.levels)) {
      candidate.levels = levels;
      evidence("levels", facts.levels);
      const update = (r: Rule): Rule =>
        r.kind === "requirement"
          ? r.field === "targetLevel"
            ? {
                ...r,
                label: `Intended study: ${levels.join(" or ")}`,
                values: levels,
                verified: false,
                evidenceKey: "levels",
              }
            : r
          : { ...r, rules: r.rules.map(update) };
      candidate.requirements = update(candidate.requirements);
    }
  }
  if (previous && facts.funding !== previous.funding) {
    candidate.fundingType = "unknown";
    candidate.funding = [];
    candidate.fundingSummary = facts.funding.slice(0, 300);
    evidence("funding", facts.funding);
    warnings.push("Funding wording changed. Review components before labelling the package.");
  }
  if (facts.status !== "unknown" && facts.status !== candidate.availability) {
    candidate.availability = z.enum(["open", "closed"]).parse(facts.status);
    evidence("availability", `Applications are ${facts.status}.`);
  }
  if (facts.deadline) {
    const instant = parseClosingInstant(facts.deadline);
    if (instant && instant !== candidate.deadline) {
      candidate.deadline = instant;
      candidate.deadlineState = "confirmed";
      candidate.deadlineLabel = facts.deadline.slice(0, 300);
      evidence("deadline", facts.deadline);
    } else if (!instant && previous && facts.deadline !== previous.deadline) {
      candidate.deadline = null;
      candidate.deadlineState = "date_only";
      candidate.deadlineLabel = facts.deadline.slice(0, 300);
      evidence("deadline", facts.deadline, "conflicting");
      warnings.push(
        "Changed deadline has no unambiguous closing instant; reminders must wait for confirmation.",
      );
    }
  } else if (previous?.deadline)
    warnings.push(
      "Previously extracted deadline is missing. Do not treat this as removal or closure.",
    );
  if (previous && facts.requirements !== previous.requirements) {
    warnings.push(
      "Requirement wording changed. Review the structured rules and exceptions before accepting.",
    );
    const confirm: Rule = {
      kind: "requirement",
      id: "source-change-confirmation",
      label:
        "Changed provider requirements need individual confirmation against this accepted source version.",
      field: "providerConfirmation",
      op: "confirmed",
      verified: false,
      evidenceKey: "source.requirements",
    };
    if (candidate.requirements.kind === "all")
      candidate.requirements.rules = [
        ...candidate.requirements.rules.filter((r) => r.id !== confirm.id),
        confirm,
      ];
    else
      candidate.requirements = {
        kind: "all",
        id: "source-updated-all",
        label: "Accepted provider conditions",
        rules: [candidate.requirements, confirm],
      };
  }
  return {
    candidate: scholarshipDataSchema.parse(candidate),
    facts,
    warnings,
    excerpt: [heading, ...Object.values(facts)].join("\n").slice(0, 1200),
  };
}
