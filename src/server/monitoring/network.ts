import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
export const USER_AGENT = "GrantPath/1.0 (bounded scholarship evidence checks)";
export const supportedSources: Record<string, { host: string; paths: string[] }> = {
  "ucl-scholarship": {
    host: "www.ucl.ac.uk",
    paths: [
      "/scholarships/ucl-global-masters-scholarship",
      "/scholarships/ucl-global-undergraduate-scholarship",
    ],
  },
  "oxford-clarendon": {
    host: "www.ox.ac.uk",
    paths: ["/admissions/graduate/fees-and-funding/funding/clarendon/applicants"],
  },
  "csc-masters": {
    host: "cscuk.fcdo.gov.uk",
    paths: ["/scholarships/commonwealth-masters-scholarships/"],
  },
  "twente-uts": {
    host: "www.utwente.nl",
    paths: ["/en/education/scholarship-finder/university-of-twente-scholarship/"],
  },
};
export function validateSourceUrl(raw: string, adapter: string, robots = false) {
  const source = supportedSources[adapter];
  if (!source) throw new Error("This adapter is not supported.");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== source.host ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (robots ? url.pathname !== "/robots.txt" : !source.paths.includes(url.pathname))
  )
    throw new Error("Source URL is outside this adapter’s explicit public allowlist.");
  return url;
}
export function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 192 && b === 0)
    );
  }
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    // Only globally routable unicast; mapped IPv4 and local/link-local ranges are rejected.
    return /^[23]/.test(lower) && !lower.startsWith("2001:db8:");
  }
  return false;
}
export async function boundedFetch(raw: string, adapter: string, robots = false) {
  const url = validateSourceUrl(raw, adapter, robots);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Source DNS did not resolve exclusively to public addresses.");
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: robots ? "text/plain" : "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  if (response.status >= 300 && response.status < 400)
    throw new Error(
      "Source redirected. Review and allowlist its new canonical address before fetching.",
    );
  if (!robots && !response.headers.get("content-type")?.toLowerCase().includes("text/html"))
    throw new Error(`Unexpected source content type (${response.status}).`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The source returned an empty body.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  const maximum = robots ? 100_000 : 2_000_000;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > maximum) {
      await reader.cancel();
      throw new Error("Source response exceeded the bounded download limit.");
    }
    chunks.push(part.value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return { status: response.status, text: new TextDecoder().decode(buffer) };
}
type Directive = { allow: boolean; path: string };
export function robotsPolicy(text: string, path: string) {
  const groups: { agents: string[]; rules: Directive[]; delay: number }[] = [];
  let current = { agents: [] as string[], rules: [] as Directive[], delay: 0 };
  let hasDirectives = false;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    const match = clean.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (hasDirectives) {
        groups.push(current);
        current = { agents: [], rules: [], delay: 0 };
        hasDirectives = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (current.agents.length) {
      hasDirectives = true;
      if ((key === "allow" || key === "disallow") && value)
        current.rules.push({ allow: key === "allow", path: value });
      if (key === "crawl-delay" && Number.isFinite(Number(value)))
        current.delay = Math.max(0, Number(value));
    }
  }
  groups.push(current);
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && "grantpath".includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  let best: Directive | null = null;
  for (const rule of applicable.flatMap((g) => g.rules)) {
    const pattern =
      "^" +
      rule.path
        .split("*")
        .map((v) => v.replace(/[.+?^{}()|[\]\\]/g, "\\$&"))
        .join(".*");
    if (
      new RegExp(pattern).test(path) &&
      (!best ||
        rule.path.length > best.path.length ||
        (rule.path.length === best.path.length && rule.allow))
    )
      best = rule;
  }
  return {
    allowed: best?.allow ?? true,
    crawlDelaySeconds: Math.max(0, ...applicable.map((g) => g.delay)),
  };
}
