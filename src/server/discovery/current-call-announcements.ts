import * as cheerio from "cheerio";
import type { OpportunityAdapter } from "./adapter-registry";
import { erasmusProgrammeMappings } from "../../data/erasmus-programmes";
import { semanticHash } from "../scholarships/publish";
const clean = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
// A programme reference is explicitly approved in code. News membership never
// supplies a new programme identity or broadens permission to fetch backlinks.
const profiles = [
  {
    id: "ediss-intake-announcement",
    host: "www.master-ediss.eu",
    path: /^\/upcoming-application-rounds-ediss-intake-\d+\/$/,
    programmeKey: "erasmus-ediss-data-intensive-software",
    programmeLink: "https://www.master-ediss.eu/admission/",
    root: "article",
    title: "h1.entry-title",
    cycle: /academic years (20\d{2})-(\d{2})/,
    window:
      /1\. Round for Erasmus Mundus and EDISS Scholarship applications Opening on (\d{2}\.\d{2}\.20\d{2} at \d{1,2}:\d{2}\s*(?:am|pm) Helsinki time) and closing on (\d{2}\.\d{2}\.20\d{2} at \d{1,2}:\d{2}\s*(?:am|pm) Helsinki time)/i,
  },
];
export const currentCallAnnouncementAdapter: OpportunityAdapter = {
  id: "official-programme-call-1",
  media: ["html"],
  supports: (url) => profiles.some((p) => p.host === url.hostname && p.path.test(url.pathname)),
  extract: (definition, url, document) => {
    if (definition.dynamicDetail !== "official-programme-call-1") return;
    const profile = profiles.find(
      (p) => p.host === new URL(url).hostname && p.path.test(new URL(url).pathname),
    );
    if (!profile) return;
    const $ = cheerio.load(document.text);
    $("script,style,nav,footer,noscript,iframe").remove();
    $("header").not("header.entry-header").remove();
    const root = $(profile.root),
      title = clean(root.find(profile.title).text()),
      text = clean(root.text());
    if (
      root.length !== 1 ||
      !title.includes("EDISS Intake") ||
      !root.find(`a[href="${profile.programmeLink}"]`).length
    )
      return;
    const cycle = text.match(profile.cycle),
      window = text.match(profile.window);
    if (!cycle || !window || +cycle[2] <= +cycle[1].slice(-2)) return;
    const base = erasmusProgrammeMappings.find((m) => m.key === profile.programmeKey)!;
    // Current funding evidence must support the same intake. A later news post
    // cannot inherit a previous intake's scholarship package automatically.
    if (base.cycle !== `${cycle[1]}/${cycle[2]}`) return;
    const mapping = structuredClone(base);
    mapping.url = url;
    mapping.heading = title;
    mapping.contentSelector = profile.root;
    mapping.preserveHeaders = "header.entry-header";
    mapping.sections = [{ selector: profile.root, hash: semanticHash(text) }];
    mapping.applicationWindow = {
      opening: window[1],
      closing: window[2],
      sourceHash: semanticHash(text),
    };
    for (let start = 0; start < text.length; start += 1200) {
      const field = `announcement${start / 1200 + 1}`,
        passage = text.slice(start, start + 1200);
      mapping.passages[field] = passage;
      mapping.data.evidence.push({
        field,
        passage,
        url,
        state: "verified",
        retrievedAt: new Date().toISOString(),
      });
    }
    // Preserve accepted programme/cycle data; record the call as window evidence
    // on this observation, rather than duplicating the same academic intake.
    return mapping;
  },
};
