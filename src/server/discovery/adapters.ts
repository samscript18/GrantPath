import { parseClosingInstant } from "@/server/monitoring/adapters";
import * as cheerio from "cheerio";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { semanticHash } from "@/server/scholarships/publish";
import { allowedDiscoveryUrl, canonicalDiscoveryUrl } from "./urls";
import type { DirectoryDefinition, DetailMapping, Validation } from "./types";
export const cleanText = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();
export function extractDirectory(
  definition: DirectoryDefinition,
  html: string,
  pageUrl = definition.url,
) {
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  const $ = cheerio.load(html);
  if (!cleanText($("h1,h2,title").text()).toLowerCase().includes(definition.heading.toLowerCase()))
    throw new Error("DIRECTORY_LAYOUT_CHANGED");
  const links = new Set<string>();
  const primary = new Set(definition.mappings.map((m) => m.url));
  const supportingOnly = new Set(
    definition.mappings.flatMap((m) => m.supportPages || []).filter((url) => !primary.has(url)),
  );
  $(definition.linkSelector).each((_, el) => {
    if (links.size >= 100) return;
    try {
      const detail = allowedDiscoveryUrl(
        canonicalDiscoveryUrl($(el).attr("href") || "", pageUrl),
        definition,
        "detail",
      ).href;
      if (!supportingOnly.has(detail)) links.add(detail);
    } catch {
      /* An external or unexpected link is not a source. */
    }
  });
  const next = new Set<string>();
  if (definition.pagination)
    $(definition.pagination.selector).each((_, el) => {
      if (next.size >= 2) return;
      try {
        next.add(
          allowedDiscoveryUrl(
            canonicalDiscoveryUrl($(el).attr("href") || "", pageUrl),
            definition,
            "directory",
          ).href,
        );
      } catch {
        /* Unsupported pagination is not followed. */
      }
    });
  if (!links.size) throw new Error("DIRECTORY_NO_SUPPORTED_LINKS");
  return { links: [...links], next: [...next] };
}
export function extractDetail(
  mapping: DetailMapping,
  html: string,
  now = new Date(),
  supportPages: Record<string, string> = {},
) {
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,noscript,iframe").remove();
  const root = $("main").first().length ? $("main").first() : $("body");
  const text = cleanText(root.text());
  const heading = cleanText(root.find("h1,h2,h3").text());
  const structure = heading.toLowerCase().includes(mapping.heading.toLowerCase());
  const codes: string[] = structure ? [] : ["DETAIL_LAYOUT_CHANGED"];
  const canonicalLink = $("link[rel=canonical]").attr("href");
  if (canonicalLink) {
    try {
      const canonical = new URL(canonicalLink, mapping.url);
      if (canonical.hostname !== new URL(mapping.url).hostname)
        codes.push("UNSAFE_SOURCE_IDENTITY");
    } catch {
      codes.push("UNSAFE_SOURCE_IDENTITY");
    }
  }
  if (mapping.requirementsComplete && !mapping.sections?.length)
    codes.push("SEMANTIC_SECTION_BASELINE_MISSING");
  const matchedFields: string[] = [];
  if (
    mapping.cycleConfirmed &&
    (!mapping.passages.cycle ||
      [...mapping.cycle.matchAll(/20\d{2}/g)].some(
        ([year]) => !mapping.passages.cycle.includes(year),
      ))
  )
    codes.push("CYCLE_TEXT_IDENTITY_MISMATCH");
  for (const [field, passage] of Object.entries(mapping.passages)) {
    if (
      (field === "deadline" && mapping.deadlineSelector) ||
      (field === "levels" && mapping.levelSelector)
    )
      continue;
    const evidenceUrl = mapping.data.evidence.find((e) => e.field === field)?.url || mapping.url;
    const supporting =
      evidenceUrl === mapping.url
        ? text
        : supportPages[evidenceUrl]
          ? cleanText(cheerio.load(supportPages[evidenceUrl]).text())
          : "";
    const required = [
      passage,
      ...mapping.data.evidence
        .filter((e) => e.field === field && e.state === "verified")
        .map((e) => e.passage),
    ];
    if (required.every((claim) => supporting.includes(cleanText(claim)))) matchedFields.push(field);
    else codes.push(`EVIDENCE_MISSING:${field}`);
  }
  for (const section of mapping.sections || []) {
    if (
      !$(section.selector).length ||
      semanticHash(cleanText($(section.selector).text())) !== section.hash
    )
      codes.push("UNSUPPORTED_SECTION_CHANGE");
  }
  const data = scholarshipDataSchema.parse(structuredClone(mapping.data));
  data.evidence = data.evidence.map((e) => ({
    ...e,
    url: e.url,
    retrievedAt: now.toISOString(),
    state: matchedFields.includes(e.field) ? e.state : "missing",
  }));
  if (mapping.deadlineSelector) {
    const label = cleanText($(mapping.deadlineSelector).text());
    const instant = parseClosingInstant(label);
    if (!instant || !mapping.cycleConfirmed) codes.push("DEADLINE_SEMANTICS_UNSUPPORTED");
    else {
      data.deadline = instant;
      data.deadlineState = "confirmed";
      data.deadlineLabel = label;
      const evidence = data.evidence.find((e) => e.field === "deadline");
      if (evidence) {
        evidence.passage = label;
        evidence.state = "verified";
        matchedFields.push("deadline");
      } else codes.push("DEADLINE_EVIDENCE_MISSING");
    }
  }
  if (mapping.levelSelector) {
    const level = cleanText($(mapping.levelSelector).text());
    if (!["bachelor", "master", "doctorate"].includes(level))
      codes.push("LEVEL_SEMANTICS_UNSUPPORTED");
    else {
      data.levels = [level as "bachelor" | "master" | "doctorate"];
      let updated = false;
      const update = (
        rule: import("@/server/eligibility/rules").Rule,
      ): import("@/server/eligibility/rules").Rule => {
        if (rule.kind !== "requirement") return { ...rule, rules: rule.rules.map(update) };
        if (rule.id === mapping.levelRuleId && rule.field === "targetLevel" && rule.op === "in") {
          updated = true;
          return { ...rule, values: [level] };
        }
        return rule;
      };
      data.requirements = update(data.requirements);
      const evidence = data.evidence.find((e) => e.field === "levels");
      if (!updated || !evidence) codes.push("LEVEL_RULE_MAPPING_MISSING");
      else {
        evidence.passage = level;
        evidence.state = "verified";
        matchedFields.push("levels");
      }
    }
  }
  const validation: Validation = {
    codes,
    structure,
    matchedFields,
    requirementsComplete: mapping.requirementsComplete,
    cycleConfirmed: mapping.cycleConfirmed,
  };
  return { data, validation, excerpt: text.slice(0, 8000) };
}
