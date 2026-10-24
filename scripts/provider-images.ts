import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { load } from "cheerio";
import { db } from "../src/lib/db";
import { reviewedCatalogue } from "../src/data/catalogue";
import { isPublicAddress, robotsPolicy, USER_AGENT } from "../src/server/monitoring/network";
import { saveProviderImage, providerImageVersion } from "../src/server/scholarships/images";
import { kickAccountEvent } from "../src/server/accounts/jobs";
const output = ".local/provider-images";
const sourcePages: Record<string, string> = {
  oxford: "https://www.ox.ac.uk/",
  commonwealth: "https://cscuk.fcdo.gov.uk/",
  chevening: "https://www.chevening.org/",
  ucl: "https://www.ucl.ac.uk/",
  bristol: "https://www.bristol.ac.uk/",
  eth: "https://ethz.ch/en.html",
  warwick: "https://warwick.ac.uk/",
  twente: "https://www.utwente.nl/en/",
  leiden: "https://www.universiteitleiden.nl/en",
  nuffic: "https://www.studyinnl.org/",
  dfat: "https://www.dfat.gov.au/",
};
type Candidate = {
  slug: string;
  name: string;
  sourceUrl: string;
  imageUrl: string;
  localFile: string;
  checkedAt: string;
  reviewed: boolean;
  error?: string;
};
async function fetchBytes(raw: string, origin: string, maxBytes: number, allowRedirect = false) {
  const url = new URL(raw);
  if (
    url.origin !== origin ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("Image URL outside the reviewed official origin.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((row) => !isPublicAddress(row.address)))
    throw new Error("Official host did not resolve to public addresses.");
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
  });
  if (allowRedirect && response.status >= 300 && response.status < 400) {
    const redirect = new URL(response.headers.get("location") || "", url);
    return fetchBytes(redirect.href, origin, maxBytes, false);
  }
  if (!response.ok) throw new Error(`Official source returned HTTP ${response.status}.`);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty official response.");
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.length;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error("Official image response exceeds the size limit.");
    }
    chunks.push(part.value);
  }
  return { bytes: Buffer.concat(chunks), contentType: response.headers.get("content-type") || "" };
}
async function discover() {
  await mkdir(output, { recursive: true });
  const rows: Candidate[] = [];
  const providers = [
    ...new Map(reviewedCatalogue.map((entry) => [entry.providerSlug, entry])).values(),
  ];
  for (const entry of providers) {
    const sourceUrl = sourcePages[entry.providerSlug];
    if (!sourceUrl) continue;
    const row: Candidate = {
      slug: entry.providerSlug,
      name: entry.provider,
      sourceUrl,
      imageUrl: "",
      localFile: "",
      checkedAt: "",
      reviewed: false,
    };
    try {
      const origin = new URL(sourceUrl).origin;
      let robots = "";
      try {
        robots = (await fetchBytes(`${origin}/robots.txt`, origin, 100_000)).bytes.toString("utf8");
      } catch (e) {
        if (!(e instanceof Error && /HTTP 404/.test(e.message))) throw e;
      }
      const policy = robotsPolicy(robots, new URL(sourceUrl).pathname);
      if (!policy.allowed || policy.crawlDelaySeconds > 0)
        throw new Error("Source policy needs manual review before image collection.");
      const html = await fetchBytes(sourceUrl, origin, 2_000_000, true);
      if (!html.contentType.includes("text/html"))
        throw new Error("Unexpected official page format.");
      const $ = load(html.bytes.toString("utf8"));
      const candidates: string[] = [];
      $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each(
        (_, node) => {
          const href = $(node).attr("href");
          if (href) candidates.push(href);
        },
      );
      $("img").each((_, node) => {
        const image = $(node);
        if (/logo/i.test([image.attr("alt"), image.attr("class"), image.attr("src")].join(" "))) {
          const src = image.attr("src");
          if (src && !/linkedin|facebook|twitter|instagram|youtube|tiktok|social/i.test(src))
            candidates.push(src);
        }
      });
      $('link[rel="icon"]').each((_, node) => {
        const href = $(node).attr("href");
        if (href) candidates.push(href);
      });
      for (const href of [...new Set(candidates)].slice(0, 5)) {
        try {
          const imageUrl = new URL(href, sourceUrl);
          if (!robotsPolicy(robots, imageUrl.pathname).allowed) continue;
          const file = await fetchBytes(imageUrl.href, origin, 2_000_000);
          if (!/^image\//i.test(file.contentType)) continue;
          const { default: sharp } = await import("sharp");
          const normalized = await sharp(file.bytes, { limitInputPixels: 8_000_000 })
            .resize(480, 480, { fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#fffefa" })
            .jpeg({ quality: 82 })
            .timeout({ seconds: 3 })
            .toBuffer();
          if (normalized.length > 64 * 1024) continue;
          row.imageUrl = imageUrl.href;
          row.localFile = `${output}/${entry.providerSlug}.jpg`;
          row.checkedAt = new Date().toISOString();
          await writeFile(row.localFile, normalized);
          break;
        } catch {
          /* Try only the next bounded, same-origin candidate. */
        }
      }
      if (!row.localFile)
        throw new Error("No usable same-origin logo found within the bounded candidates.");
    } catch (e) {
      row.error = e instanceof Error ? e.message : "Official image unavailable.";
    }
    rows.push(row);
    console.log(`${row.slug}: ${row.localFile ? "candidate saved for visual review" : row.error}`);
  }
  await writeFile(`${output}/manifest.json`, JSON.stringify(rows, null, 2));
}
async function publish() {
  const rows = JSON.parse(await readFile(`${output}/manifest.json`, "utf8")) as Candidate[];
  const actor = {
    id: "official-provider-image-review:2026-10-24",
    name: "Official provider image curation",
    email: "catalogue@example.test",
    role: "operator",
  };
  for (const row of rows.slice(0, 12)) {
    if (!row.reviewed || !row.localFile || row.error) continue;
    if (row.localFile !== `${output}/${row.slug}.jpg` || !/^[a-z-]+$/.test(row.slug))
      throw new Error("Unexpected local image path.");
    const provider = await db().provider.findUnique({ where: { slug: row.slug } });
    if (!provider || provider.imageUrl) continue;
    const bytes = await readFile(row.localFile);
    const result = await saveProviderImage(actor, {
      providerId: provider.id,
      previousVersion: providerImageVersion(provider.imageUrl),
      image: `data:image/jpeg;base64,${bytes.toString("base64")}`,
      sourceUrl: row.sourceUrl,
      alt: `${provider.name} official site identity`,
    });
    for (const id of result.cleanupEventIds) await kickAccountEvent(id);
    console.log(`${row.slug}: reviewed image persisted on Cloudinary`);
  }
}
async function report() {
  const candidates = JSON.parse(await readFile(`${output}/manifest.json`, "utf8")) as Candidate[];
  const providers = await db().provider.findMany({
    select: { slug: true, imageUrl: true, imageSourceUrl: true, imageUpdatedAt: true },
  });
  const rows = candidates.map((candidate) => {
    const stored = providers.find((provider) => provider.slug === candidate.slug);
    return {
      provider: candidate.name,
      slug: candidate.slug,
      sourcePage: candidate.sourceUrl,
      sourceImage: candidate.imageUrl || null,
      checkedAt: candidate.checkedAt || null,
      visuallyReviewed: candidate.reviewed,
      persistedImageUrl: stored?.imageUrl || null,
      persistedAt: stored?.imageUpdatedAt?.toISOString() || null,
      limitation: candidate.error || null,
    };
  });
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/provider-images.json",
    JSON.stringify(
      { observedAt: new Date().toISOString(), environment: "development", providers: rows },
      null,
      2,
    ) + "\n",
  );
  console.log(`Recorded actual provider image state for ${rows.length} providers.`);
}

try {
  if (process.argv.includes("--discover")) await discover();
  else if (process.argv.includes("--publish-reviewed")) await publish();
  else if (process.argv.includes("--report")) await report();
  else
    throw new Error(
      "Choose --discover or --publish-reviewed. Visually review candidates and mark reviewed:true before publishing.",
    );
} catch (e) {
  console.error(e instanceof Error ? e.message : "Provider image operation failed.");
  process.exitCode = 1;
} finally {
  await db().$disconnect();
}
