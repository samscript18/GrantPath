/** Independently authored test oracle. It imports no production evaluator, rule parser
 * or combination helpers. Boolean intervals encode every completion of an unknown
 * leaf; min/max interval operations specify monotone AND/OR truth bounds. This is
 * a reference for the generated logical grammar, not a proof of all domain facts. */
export type ReferenceTree =
  { value: "true" | "false" | "unknown" } | { operator: "and" | "or"; children: ReferenceTree[] };
export function referenceBounds(tree: ReferenceTree): [number, number] {
  if ("value" in tree)
    return tree.value === "true" ? [1, 1] : tree.value === "false" ? [0, 0] : [0, 1];
  const intervals = tree.children.map(referenceBounds);
  if (!intervals.length) return [0, 1];
  const aggregate = tree.operator === "and" ? Math.min : Math.max;
  return [aggregate(...intervals.map((i) => i[0])), aggregate(...intervals.map((i) => i[1]))];
}
export function referenceOutcome(tree: ReferenceTree) {
  const [lower, upper] = referenceBounds(tree);
  return lower === 1 ? "eligible" : upper === 0 ? "not_eligible" : "potential";
}
