import * as cheerio from "cheerio";
import { canonicalDiscoveryUrl } from "./urls";

export type StructuredOpportunity = {
  name: string;
  url: string;
  description?: string;
  educationalLevel?: string;
  startDate?: string;
  endDate?: string;
};
// These values are evidence candidates, not validated eligibility or dates.
// Never dereference a remote @context, @id, URL or metadata attachment.
export function extractStructuredMetadata(html: string, pageUrl: string) {
  if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  if (scripts.length > 20) throw new Error("STRUCTURED_METADATA_LIMIT");
  const opportunities: StructuredOpportunity[] = [];
  const links = new Set<string>();
  let visited = 0;
  const visit = (value: unknown, depth = 0) => {
    if (++visited > 200 || depth > 8) throw new Error("STRUCTURED_METADATA_LIMIT");
    if (Array.isArray(value)) return value.forEach((node) => visit(node, depth + 1));
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node["@graph"]) visit(node["@graph"], depth + 1);
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.includes("ItemList") && Array.isArray(node.itemListElement)) {
      for (const item of node.itemListElement.slice(0, 100)) {
        const v =
          typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        const nested =
          typeof v.item === "object" && v.item !== null ? (v.item as Record<string, unknown>) : {};
        const url =
          typeof v.url === "string" ? v.url : typeof v.item === "string" ? v.item : nested.url;
        if (typeof url === "string") {
          try {
            links.add(canonicalDiscoveryUrl(url, pageUrl));
          } catch {
            /* Untrusted URL. */
          }
        }
      }
    }
    if (
      !types.some((type) =>
        ["Grant", "MonetaryGrant", "EducationalOccupationalProgram"].includes(String(type)),
      )
    )
      return;
    if (
      typeof node.name !== "string" ||
      node.name.length < 3 ||
      node.name.length > 180 ||
      typeof node.url !== "string"
    )
      throw new Error("STRUCTURED_OPPORTUNITY_INVALID");
    const url = canonicalDiscoveryUrl(node.url, pageUrl);
    if (url !== canonicalDiscoveryUrl(pageUrl, pageUrl))
      throw new Error("STRUCTURED_IDENTITY_CONFLICT");
    const opportunity: StructuredOpportunity = { name: node.name, url };
    for (const key of ["description", "educationalLevel", "startDate", "endDate"] as const) {
      if (node[key] !== undefined) {
        if (typeof node[key] !== "string" || node[key].length > 1400)
          throw new Error("STRUCTURED_OPPORTUNITY_INVALID");
        opportunity[key] = node[key];
      }
    }
    opportunities.push(opportunity);
  };
  scripts.each((_, script) => {
    const text = $(script).text();
    if (Buffer.byteLength(text) > 100000) throw new Error("STRUCTURED_METADATA_LIMIT");
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error("STRUCTURED_METADATA_INVALID");
    }
    visit(value);
  });
  return { opportunities, links: [...links] };
}
