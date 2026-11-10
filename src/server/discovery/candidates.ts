import type { DirectoryDefinition } from "./types";
import { canonicalDiscoveryUrl } from "./urls";

// Fetch permission is broader than opportunity identity: supporting pages and
// navigation may be allowed evidence URLs without being catalogue candidates.
export function supportsCandidate(definition: DirectoryDefinition, raw: string) {
  if (!definition.restrictToSupportedDetails) return true;
  const url = new URL(canonicalDiscoveryUrl(raw, definition.url));
  if (definition.mappings.some((mapping) => mapping.url === url.href)) return true;
  if (definition.dynamicDetail === "makerere-announcement-1")
    return (
      url.hostname === "apply.mastercardfoundation.mak.ac.ug" &&
      /^\/announcements\/\d+\/?$/.test(url.pathname)
    );
  if (definition.dynamicDetail === "twente-award-1")
    return (
      url.hostname === "www.utwente.nl" &&
      /^\/en\/education\/scholarship-finder\/(?:kipaji-scholarship|professor-de-winter-scholarship|itc-[a-z0-9-]+-scholarship-programme|nl-scholarship-university-of-twente)\/$/.test(
        url.pathname,
      )
    );
  return false;
}
