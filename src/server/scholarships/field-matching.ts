import { createHash } from "node:crypto";
import { classifyFields, vertexFieldConfig, type FieldCandidate } from "./vertex-fields";

export type FieldMatching = "semantic" | "text_only";
type MatchResult = { ids: string[]; mode: FieldMatching };

// Bounded, process-local memoization also coalesces concurrent pagination requests.
// Accepted content changes invalidate the key; failures have a short retry window.
export function createFieldMatcher(classify = classifyFields, now = Date.now) {
  const cache = new Map<string, { expires: number; result: Promise<MatchResult> }>();
  return async (
    query: string,
    candidates: FieldCandidate[],
    env: Record<string, string | undefined> = process.env,
  ): Promise<MatchResult> => {
    const field = query.trim().toLowerCase();
    const fallback = (): MatchResult => ({
      ids: candidates
        .filter((candidate) => candidate.fields.toLowerCase().includes(field))
        .map((candidate) => candidate.id),
      mode: "text_only",
    });
    let config: ReturnType<typeof vertexFieldConfig>;
    try {
      config = vertexFieldConfig(env);
    } catch {
      return fallback();
    }
    if (!candidates.length) return { ids: [], mode: "semantic" };
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          config,
          env.VERTEX_CREDENTIALS_JSON,
          env.GOOGLE_APPLICATION_CREDENTIALS,
          field,
          candidates,
        ]),
      )
      .digest("hex");
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.result;
    for (const [key, entry] of cache) if (entry.expires <= now()) cache.delete(key);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    const entry = {
      expires: now() + 3_600_000,
      result: Promise.resolve<MatchResult>({ ids: [], mode: "semantic" }),
    };
    entry.result = classify(field, candidates, env).then(
      (ids): MatchResult => ({ ids, mode: "semantic" }),
      () => {
        entry.expires = now() + 30_000;
        return fallback();
      },
    );
    cache.set(key, entry);
    return entry.result;
  };
}
export const matchStudyField = createFieldMatcher();
