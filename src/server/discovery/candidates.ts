import type { DirectoryDefinition } from "./types";
import { canonicalDiscoveryUrl } from "./urls";
import { opportunityAdapters } from "./adapter-registry";

// Fetch permission is broader than opportunity identity: supporting pages and
// navigation may be allowed evidence URLs without being catalogue candidates.
export function supportsCandidate(definition: DirectoryDefinition, raw: string) {
  if (!definition.restrictToSupportedDetails) return true;
  const url = new URL(canonicalDiscoveryUrl(raw, definition.url));
  if (definition.mappings.some((mapping) => mapping.url === url.href)) return true;
  return opportunityAdapters.get(definition.dynamicDetail)?.supports(url, definition) ?? false;
}
