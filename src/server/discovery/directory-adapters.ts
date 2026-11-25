import { extractDirectory } from "./adapters";
import { extractStructuredMetadata } from "./structured-metadata";
import { allowedDiscoveryUrl } from "./urls";
import { supportsCandidate } from "./candidates";
import type { DirectoryDefinition } from "./types";
import * as cheerio from "cheerio";
import { canonicalDiscoveryUrl } from "./urls";
import { fundingProfiles, fundingProgrammeKey } from "./university-funding";

export type ProgrammeLead = {
  title: string;
  url: string;
  discoveredFrom: string;
  authorization: "unapproved";
};
export type DirectoryExtraction = ReturnType<typeof extractDirectory> & { leads?: ProgrammeLead[] };

export interface DirectoryAdapter {
  id: string;
  extract(definition: DirectoryDefinition, html: string, pageUrl: string): DirectoryExtraction;
}
export const directoryAdapters: Map<string, DirectoryAdapter> = new Map<string, DirectoryAdapter>([
  [
    "official-recent-call-links-1",
    {
      id: "official-recent-call-links-1",
      extract: (definition, html, pageUrl) => {
        const extracted = extractDirectory(definition, html, pageUrl),
          $ = cheerio.load(html);
        const published = new Map<string, number>();
        $(definition.linkSelector).each((_, el) => {
          try {
            const url = canonicalDiscoveryUrl($(el).attr("href")!, pageUrl);
            const dates = $(el)
              .closest("article,.news-content")
              .find("time[datetime]")
              .map((_, e) => Date.parse($(e).attr("datetime")!))
              .get()
              .filter(Number.isFinite);
            published.set(url, dates.length ? Math.max(...dates) : 0);
          } catch {
            /* Unsupported links remain excluded by the shared extractor. */
          }
        });
        return {
          ...extracted,
          links: extracted.links
            .filter((url) => supportsCandidate(definition, url))
            .sort(
              (a, b) => (published.get(b) || 0) - (published.get(a) || 0) || a.localeCompare(b),
            ),
        };
      },
    },
  ],
  [
    "official-government-feed-1",
    {
      id: "official-government-feed-1",
      extract: (definition, body, pageUrl) => {
        if (Buffer.byteLength(body) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          throw new Error("DIRECTORY_JSON_INVALID");
        }
        const rows =
          payload && typeof payload === "object" && "data" in payload ? payload.data : undefined;
        if (!Array.isArray(rows) || !rows.length || rows.length > 1000)
          throw new Error("DIRECTORY_LAYOUT_CHANGED");
        const links = new Set<string>(),
          leads: ProgrammeLead[] = [];
        let excluded = 0;
        for (const row of rows) {
          if (
            !row ||
            typeof row !== "object" ||
            typeof row.profile !== "string" ||
            typeof row.program !== "string"
          )
            throw new Error("DIRECTORY_LAYOUT_CHANGED");
          if (!row.profile.includes("Student")) {
            excluded++;
            continue;
          }
          const $ = cheerio.load(row.program),
            link = $("a[href]");
          if (link.length !== 1) {
            excluded++;
            continue;
          }
          try {
            const url = canonicalDiscoveryUrl(link.attr("href")!, pageUrl),
              title = link.text().replace(/\s+/g, " ").trim();
            try {
              const allowed = allowedDiscoveryUrl(url, definition, "detail").href;
              if (links.size < 100) links.add(allowed);
            } catch {
              if (leads.length < 100 && !leads.some((lead) => lead.url === url))
                leads.push({ title, url, discoveredFrom: pageUrl, authorization: "unapproved" });
            }
          } catch {
            excluded++;
          }
        }
        return { links: [...links], leads, next: [], excluded };
      },
    },
  ],
  [
    "jasso-funding-cards-1",
    {
      id: "jasso-funding-cards-1",
      extract: (definition, html, pageUrl) => {
        const extracted = directoryAdapters
          .get("university-funding-cards-1")!
          .extract(definition, html, pageUrl);
        const $ = cheerio.load(html),
          current = Number(new URL(pageUrl).searchParams.get("offset") || 0);
        const offsets = $("a.list[onclick]")
          .map((_, el) =>
            Number(
              $(el)
                .attr("onclick")
                ?.match(/^page\((\d+)\); return false;$/)?.[1],
            ),
          )
          .get()
          .filter((n) => Number.isInteger(n) && n > current && n <= 2000)
          .sort((a, b) => a - b);
        const next = new URL(definition.url);
        next.searchParams.set("go", "ofs");
        next.searchParams.set("offset", String(offsets[0]));
        next.searchParams.set("limit", "25");
        next.searchParams.set("narabikae", "2");
        next.searchParams.set("school_name", "");
        return {
          ...extracted,
          next: offsets.length
            ? [allowedDiscoveryUrl(next.href, definition, "directory").href]
            : [],
        };
      },
    },
  ],
  [
    "university-funding-cards-1",
    {
      id: "university-funding-cards-1",
      extract: (definition, html, pageUrl) => {
        if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
        const $ = cheerio.load(html);
        if (!$("h1,h2,h3,title").text().toLowerCase().includes(definition.heading.toLowerCase()))
          throw new Error("DIRECTORY_LAYOUT_CHANGED");
        const profile = fundingProfiles.find((p) => p.id === definition.dynamicDetail);
        if (!profile) throw new Error("UNSUPPORTED_DIRECTORY_ADAPTER");
        const found = new Map<string, { url: string; title: string }>();
        let excluded = 0;
        $(definition.linkSelector).each((_, el) => {
          try {
            let href = $(el).attr("href") || "";
            if (definition.detailLinkWrapper) {
              const wrapper = new URL(href, pageUrl),
                rule = definition.detailLinkWrapper;
              if (
                wrapper.protocol !== "https:" ||
                wrapper.hostname !== rule.host ||
                wrapper.pathname !== rule.path ||
                wrapper.username ||
                wrapper.password ||
                wrapper.port ||
                wrapper.searchParams.getAll(rule.queryKey).length !== 1
              )
                throw new Error("UNSUPPORTED_LINK_WRAPPER");
              href = wrapper.searchParams.get(rule.queryKey)!;
            }
            const url = allowedDiscoveryUrl(
              canonicalDiscoveryUrl(href, pageUrl),
              definition,
              "detail",
            ).href;
            const title = $(el).text().replace(/\s+/g, " ").trim();
            if (!supportsCandidate(definition, url) || /\bprize\b/i.test(title)) {
              excluded++;
              return;
            }
            if (!found.has(url)) found.set(url, { url, title });
          } catch {
            excluded++;
          }
        });
        // Choose the newest route for each programme rather than counting multiple
        // historical cycles toward discovery growth. Restrictions never exclude it.
        const programmes = new Map<string, { url: string; title: string }>();
        for (const item of [...found.values()].sort((a, b) => b.url.localeCompare(a.url))) {
          const key = fundingProgrammeKey(profile, item.url);
          if (!programmes.has(key)) programmes.set(key, item);
          else excluded++;
        }
        const score = (title: string) =>
          (/international|africa|doctoral|phd|research|master/i.test(title) ? 4 : 0) +
          (/scholarship|studentship/i.test(title) ? 2 : 0);
        const links = [...programmes.values()]
          .sort((a, b) => score(b.title) - score(a.title) || a.url.localeCompare(b.url))
          .slice(0, 500)
          .map((item) => item.url);
        const next: string[] = [];
        if (definition.pagination)
          $(definition.pagination.selector).each((_, el) => {
            try {
              const u = allowedDiscoveryUrl(
                canonicalDiscoveryUrl($(el).attr("href") || "", pageUrl),
                definition,
                "directory",
              ).href;
              if (next.length < 2 && !next.includes(u)) next.push(u);
            } catch {
              /* Outside reviewed pagination. */
            }
          });
        if (!links.length) throw new Error("DIRECTORY_NO_SUPPORTED_LINKS");
        return { links, next, excluded };
      },
    },
  ],
  [
    "official-programme-network-1",
    {
      id: "official-programme-network-1",
      extract: (definition, html, pageUrl) => {
        if (Buffer.byteLength(html) > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
        const $ = cheerio.load(html);
        if (!$("h1").text().includes(definition.heading))
          throw new Error("DIRECTORY_LAYOUT_CHANGED");
        const leads: ProgrammeLead[] = [];
        let excluded = 0;
        $(definition.linkSelector).each((_, el) => {
          try {
            const url = canonicalDiscoveryUrl($(el).attr("href") || "", pageUrl);
            const title = $(el).text().replace(/\s+/g, " ").trim();
            if (leads.length < 100 && title.length >= 3 && !leads.some((l) => l.url === url))
              leads.push({ title, url, discoveredFrom: pageUrl, authorization: "unapproved" });
          } catch {
            excluded++;
          }
        });
        const next: string[] = [];
        $("a.ecl-pagination__link")
          .filter((_, el) => $(el).text().trim() === "Next")
          .each((_, el) => {
            try {
              next.push(
                allowedDiscoveryUrl(
                  canonicalDiscoveryUrl($(el).attr("href") || "", pageUrl),
                  definition,
                  "directory",
                ).href,
              );
            } catch {
              /* Out of scope. */
            }
          });
        if (!leads.length) throw new Error("DIRECTORY_NO_SUPPORTED_LINKS");
        const links: string[] = [];
        for (const lead of leads) {
          try {
            links.push(allowedDiscoveryUrl(lead.url, definition, "detail").href);
          } catch {
            /* Retain unapproved external leads. */
          }
        }
        return {
          links,
          leads: leads.filter((lead) => !links.includes(lead.url)),
          next: next.slice(0, 2),
          excluded,
        };
      },
    },
  ],
  ["official-html-1", { id: "official-html-1", extract: extractDirectory }],
  [
    "official-jsonld-list-1",
    {
      id: "official-jsonld-list-1",
      extract: (definition, html, pageUrl) => {
        const metadata = extractStructuredMetadata(html, pageUrl);
        const links: string[] = [];
        let excluded = 0;
        for (const raw of metadata.links.slice(0, 100)) {
          try {
            const url = allowedDiscoveryUrl(raw, definition, "detail").href;
            if (supportsCandidate(definition, url)) links.push(url);
            else excluded++;
          } catch {
            excluded++;
          }
        }
        if (!links.length) throw new Error("DIRECTORY_NO_SUPPORTED_LINKS");
        return { links, next: [], excluded };
      },
    },
  ],
]);

export function extractRegisteredDirectory(
  definition: DirectoryDefinition,
  html: string,
  pageUrl: string,
) {
  const adapter = directoryAdapters.get(definition.directoryAdapter || "official-html-1");
  if (!adapter) throw new Error("UNSUPPORTED_DIRECTORY_ADAPTER");
  return adapter.extract(definition, html, pageUrl);
}
