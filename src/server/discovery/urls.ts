import type { DirectoryDefinition } from "./types";
export function canonicalDiscoveryUrl(raw: string, base: string) {
  const url = new URL(raw, base);
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hostname.endsWith(".")
  )
    throw new Error("UNSAFE_URL");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.href;
}
export function allowedDiscoveryUrl(
  raw: string,
  definition: DirectoryDefinition,
  kind: "directory" | "detail" | "robots",
) {
  const canonical = canonicalDiscoveryUrl(raw, definition.url);
  const url = new URL(canonical);
  const directory = new URL(definition.url);
  const allowedHosts = new Set([
    directory.hostname,
    ...definition.allowedDetails.map((v) => v.host),
  ]);
  if (kind === "robots") {
    if (!allowedHosts.has(url.hostname) || url.pathname !== "/robots.txt" || url.search)
      throw new Error("ROBOTS_OUTSIDE_POLICY");
  } else if (kind === "directory") {
    if (
      canonical !== canonicalDiscoveryUrl(definition.url, definition.url) &&
      !(
        definition.pagination &&
        url.hostname === directory.hostname &&
        url.pathname.startsWith(definition.pagination.pathPrefix) &&
        [...url.searchParams.keys()].every((key) => definition.pagination!.queryKeys.includes(key))
      )
    )
      throw new Error("DIRECTORY_OUTSIDE_POLICY");
  } else if (
    !definition.allowedDetails.some(
      (rule) =>
        url.hostname === rule.host &&
        (url.pathname === rule.pathPrefix ||
          url.pathname.startsWith(
            rule.pathPrefix.endsWith("/") ? rule.pathPrefix : rule.pathPrefix + "/",
          )),
    ) ||
    url.search
  )
    throw new Error("DETAIL_OUTSIDE_POLICY");
  // Reject encoded path separators/dot traversal before any network operation.
  if (/%(?:2f|5c|2e)|\\/i.test(url.pathname)) throw new Error("UNSAFE_PATH");
  return url;
}
