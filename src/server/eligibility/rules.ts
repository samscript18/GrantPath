import { z } from "zod";
export const fields = [
  "citizenships",
  "residence",
  "qualification",
  "targetLevel",
  "targetField",
  "currentField",
  "degreeClassification",
  "intendedStart",
  "graduationDate",
  "gpa",
  "language",
  "englishMedium",
  "experienceMonths",
  "experienceHours",
  "birthDate",
  "admission",
  "providerConfirmation",
] as const;
export type ProfileField = (typeof fields)[number];
export type Requirement = {
  kind: "requirement";
  id: string;
  label: string;
  field: ProfileField;
  op:
    | "in"
    | "notIn"
    | "min"
    | "max"
    | "before"
    | "after"
    | "onOrBefore"
    | "onOrAfter"
    | "qualification"
    | "gpa"
    | "language"
    | "confirmed";
  values?: string[];
  threshold?: number;
  scale?: number;
  equivalents?: { scale: number; minimum: number }[];
  date?: string;
  referenceDate?: string;
  allowFinalYear?: boolean;
  completionBy?: string;
  maxAgeMonths?: number;
  verified: boolean;
  evidenceKey: string;
};
export type Rule = Requirement | { kind: "all" | "any"; id: string; label: string; rules: Rule[] };
const requirementSchema = z
  .object({
    kind: z.literal("requirement"),
    id: z.string().min(1).max(80),
    label: z.string().min(3).max(500),
    field: z.enum(fields),
    op: z.enum([
      "in",
      "notIn",
      "min",
      "max",
      "before",
      "after",
      "onOrBefore",
      "onOrAfter",
      "qualification",
      "gpa",
      "language",
      "confirmed",
    ]),
    values: z.array(z.string().max(150)).min(1).max(250).optional(),
    threshold: z.number().finite().optional(),
    scale: z.number().positive().optional(),
    equivalents: z
      .array(z.object({ scale: z.number().positive(), minimum: z.number().nonnegative() }))
      .max(10)
      .optional(),
    date: z.iso.date().optional(),
    referenceDate: z.iso.date().optional(),
    allowFinalYear: z.boolean().optional(),
    completionBy: z.iso.date().optional(),
    maxAgeMonths: z.number().int().positive().optional(),
    verified: z.boolean(),
    evidenceKey: z.string().min(1).max(100),
  })
  .strict()
  .superRefine((r, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const membershipFields = [
      "citizenships",
      "residence",
      "qualification",
      "targetLevel",
      "targetField",
      "currentField",
      "degreeClassification",
      "admission",
    ];
    if (["in", "notIn"].includes(r.op) && !membershipFields.includes(r.field))
      issue("Membership conditions require a supported categorical field.");
    if (
      ["min", "max"].includes(r.op) &&
      !["experienceMonths", "experienceHours", "birthDate"].includes(r.field)
    )
      issue("Numeric comparisons require a supported numeric field and declared units.");
    if (
      ["before", "after", "onOrBefore", "onOrAfter"].includes(r.op) &&
      !["graduationDate", "birthDate", "intendedStart"].includes(r.field)
    )
      issue("Date comparisons require a supported date field.");
    if (r.op === "confirmed" && !["englishMedium", "providerConfirmation"].includes(r.field))
      issue("Confirmation conditions require a supported boolean field.");
    if (
      r.op === "gpa" &&
      r.threshold !== undefined &&
      r.scale !== undefined &&
      (r.threshold < 0 || r.threshold > r.scale)
    )
      issue("GPA threshold must be within the provider scale.");
    if (r.equivalents?.some((e) => e.minimum > e.scale))
      issue("A provider equivalence must fit its stated scale.");

    if (["in", "notIn", "qualification", "language"].includes(r.op) && !r.values?.length)
      issue("This rule needs allowed values.");
    if (["min", "max", "gpa", "language"].includes(r.op) && r.threshold === undefined)
      issue("This rule needs a threshold.");
    if (r.op === "gpa" && (!r.scale || r.field !== "gpa"))
      issue("A GPA rule needs its original provider scale and GPA field.");
    if (["before", "after", "onOrBefore", "onOrAfter"].includes(r.op) && !r.date)
      issue("A date comparison needs a reference date.");
    if (r.op === "language" && r.field !== "language")
      issue("Language rules must use the language field.");
    if (r.op === "qualification" && r.field !== "qualification")
      issue("Qualification rules must use the qualification field.");
    if (r.allowFinalYear && !r.completionBy)
      issue("Final-year acceptance requires the provider completion date.");
    if (r.field === "birthDate" && ["min", "max"].includes(r.op) && !r.referenceDate)
      issue("Age rules need the provider reference date.");
  });
const recursive: z.ZodType<Rule> = z.lazy(() =>
  z.union([
    requirementSchema,
    z
      .object({
        kind: z.enum(["all", "any"]),
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(500),
        rules: z.array(recursive).min(1).max(50),
      })
      .strict(),
  ]),
);
const boundedInput = z.unknown().superRefine((input, ctx) => {
  const stack = [{ node: input, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++count > 200 || current.depth > 8) {
      ctx.addIssue({
        code: "custom",
        message: "Rule input exceeds the supported depth or node count.",
      });
      return;
    }
    if (
      current.node &&
      typeof current.node === "object" &&
      "rules" in current.node &&
      Array.isArray(current.node.rules)
    ) {
      if (current.node.rules.length > 50) {
        ctx.addIssue({ code: "custom", message: "A group has too many rules." });
        return;
      }
      for (const node of current.node.rules) stack.push({ node, depth: current.depth + 1 });
    }
  }
});
export const ruleSchema = boundedInput.pipe(
  recursive.superRefine((rule, ctx) => {
    const ids = new Set<string>();
    let count = 0;
    function visit(r: Rule, depth: number) {
      count++;
      if (depth > 8 || count > 200 || ids.has(r.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Rules must have unique IDs, depth ≤ 8 and at most 200 nodes.",
        });
        return;
      }
      ids.add(r.id);
      if (r.kind !== "requirement") r.rules.forEach((c) => visit(c, depth + 1));
    }
    visit(rule, 0);
  }),
);
