type Result = {
  id: string;
  state: string;
  created?: number;
  existing?: number;
  excluded?: number;
  publicationKind?: string | null;
};
export function discoveryRunSummary(results: Result[]) {
  const count = (state: string) => results.filter((r) => r.state === state).length;
  return {
    processed: results.length,
    newCandidates: results.reduce((n, r) => n + (r.created || 0), 0),
    knownCandidates: results.reduce((n, r) => n + (r.existing || 0), 0),
    excludedLinks: results.reduce((n, r) => n + (r.excluded || 0), 0),
    newScholarships: results.filter(
      (r) => r.state === "auto_publish" && r.publicationKind === "new",
    ).length,
    updatedScholarships: results.filter(
      (r) => r.state === "auto_publish" && r.publicationKind === "updated",
    ).length,
    unchanged: count("unchanged"),
    awaitingReview: count("review_required"),
    rejected: count("reject"),
    ignored: count("ignored"),
    failed: count("failed") + count("unsupported_directory"),
    message: results.length
      ? "Fetching or discovering links does not imply publication. Only newScholarships counts additions to the catalogue."
      : "No due work was selected; no scholarship was added.",
  };
}
