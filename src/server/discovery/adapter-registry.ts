import type { DetailMapping, DirectoryDefinition } from "./types";
import { makerereAnnouncement } from "./makerere";
import { twenteAward } from "./twente";
import { reviewedHtmlAdapter } from "./reviewed-html";
import { universityFundingAdapters } from "./university-funding";
import { governmentFundingAdapters } from "./government-funding";
import { currentCallAnnouncementAdapter } from "./current-call-announcements";
import { governmentCurrentCallAdapter } from "./government-current-calls";

// PDF text must come from a bounded, isolated parser; a binary PDF is never
// interpreted as HTML. No PDF provider is enabled until its parser/template review.
export type SourceDocument =
  | { kind: "html"; text: string }
  | { kind: "pdf-text"; text: string; pages: number; parserVersion: string };
export interface OpportunityAdapter {
  id: string;
  media: SourceDocument["kind"][];
  supports(url: URL, definition: DirectoryDefinition): boolean;
  extract(
    definition: DirectoryDefinition,
    url: string,
    document: SourceDocument,
  ): DetailMapping | undefined;
}

export function createAdapterRegistry(adapters: OpportunityAdapter[]) {
  const entries = new Map<string, OpportunityAdapter>();
  for (const adapter of adapters) {
    if (entries.has(adapter.id)) throw new Error(`DUPLICATE_ADAPTER:${adapter.id}`);
    entries.set(adapter.id, adapter);
  }
  return {
    list: () => [...entries.values()].map(({ id, media }) => ({ id, media })),
    get: (id?: string) => (id ? entries.get(id) : undefined),
  };
}

export const opportunityAdapters = createAdapterRegistry([
  {
    id: "makerere-announcement-1",
    media: ["html"],
    supports: (url) =>
      url.hostname === "apply.mastercardfoundation.mak.ac.ug" &&
      /^\/announcements\/\d+\/?$/.test(url.pathname),
    extract: (definition, url, document) => makerereAnnouncement(definition, url, document.text),
  },
  {
    id: "twente-award-1",
    media: ["html"],
    supports: (url) =>
      url.hostname === "www.utwente.nl" &&
      /^\/en\/education\/scholarship-finder\/(?:kipaji-scholarship|professor-de-winter-scholarship|itc-[a-z0-9-]+-scholarship-programme|nl-scholarship-university-of-twente)\/$/.test(
        url.pathname,
      ),
    extract: (definition, url, document) => twenteAward(definition, url, document.text),
  },
  ...reviewedHtmlAdapter,
  ...universityFundingAdapters,
  ...governmentFundingAdapters,
  currentCallAnnouncementAdapter,
  governmentCurrentCallAdapter,
  {
    id: "reviewed-pdf-announcement-1",
    media: ["pdf-text"],
    supports: (url, definition) =>
      definition.detailFormat === "pdf" &&
      definition.mappings.some((mapping) => mapping.url === url.href),
    extract: (definition, url, document) => {
      const mapping = definition.mappings.find((entry) => entry.url === url);
      // CSS section contracts cannot be applied to PDF text.
      if (
        !mapping ||
        mapping.sections?.length ||
        mapping.deadlineSelector ||
        mapping.levelSelector ||
        !document.text.includes(mapping.heading)
      )
        return;
      return mapping;
    },
  },
]);

export function resolveDetailMapping(
  definition: DirectoryDefinition,
  url: string,
  document: SourceDocument,
) {
  if (Buffer.byteLength(document.text) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  if ((definition.detailFormat === "pdf") !== (document.kind === "pdf-text")) return;
  if (
    document.kind === "pdf-text" &&
    (!Number.isInteger(document.pages) || document.pages < 1 || document.pages > 30)
  )
    throw new Error("PDF_PAGE_LIMIT");
  const mapped = definition.mappings.find((mapping) => mapping.url === url);
  if (mapped && document.kind === "html") return mapped;
  const adapter = opportunityAdapters.get(definition.dynamicDetail);
  if (
    !adapter ||
    !adapter.media.includes(document.kind) ||
    !adapter.supports(new URL(url), definition)
  )
    return;
  return adapter.extract(definition, url, document);
}
