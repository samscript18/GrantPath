import { z } from "zod";
import { ruleSchema, type Rule } from "@/server/eligibility/rules";
const officialUrl = z
  .url()
  .refine((v) => new URL(v).protocol === "https:", "Official evidence must use HTTPS");
export const evidenceSchema = z
  .object({
    field: z.string().min(1).max(100),
    url: officialUrl,
    passage: z.string().max(1400),
    state: z.enum(["verified", "missing", "conflicting", "unavailable"]),
    retrievedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (v) => v.state !== "verified" || v.passage.trim().length >= 3,
    "Checked evidence requires a supporting source passage.",
  );
export const scholarshipDataSchema = z
  .object({
    title: z.string().min(3).max(180),
    summary: z.string().min(20).max(1200),
    destination: z.string().min(2).max(100),
    institution: z.string().min(2).max(160),
    levels: z
      .array(z.enum(["bachelor", "master", "doctorate"]))
      .min(1)
      .max(3),
    fields: z.array(z.string().min(2).max(100)).min(1).max(30),
    fundingType: z.enum(["comprehensive", "tuition", "partial", "unknown"]),
    funding: z
      .array(
        z
          .object({
            component: z.enum(["tuition", "living", "travel", "insurance", "other"]),
            coverage: z.enum(["full", "partial", "unspecified"]),
            description: z.string().min(3).max(250),
          })
          .strict(),
      )
      .max(10),
    fundingSummary: z.string().min(3).max(300),
    availability: z.enum(["open", "upcoming", "closed", "unknown"]),
    opensAt: z.iso.datetime().nullable().default(null),
    deadline: z.iso.datetime().nullable(),
    deadlineLabel: z.string().max(300).nullable(),
    deadlineState: z.enum(["confirmed", "date_only", "unknown", "conflicting"]),
    officialUrl,
    applicationUrl: officialUrl,
    effectiveAt: z.iso.datetime().nullable().optional(),
    sourceFacts: z.record(z.string().max(100), z.string().max(8000)).optional(),
    requirements: ruleSchema,
    evidence: z.array(evidenceSchema).min(1).max(100),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.deadlineState === "confirmed" && !data.deadline)
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "A confirmed deadline needs an official closing instant.",
      });
    if (data.deadlineState !== "confirmed" && data.deadline)
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "Uncertain deadlines cannot have an invented closing instant.",
      });
    if (
      data.fundingType === "comprehensive" &&
      !(
        data.funding.some((f) => f.component === "tuition" && f.coverage === "full") &&
        data.funding.some((f) => f.component === "living")
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["fundingType"],
        message: "Comprehensive funding must include full tuition and living support.",
      });
    function visit(rule: Rule) {
      if (rule.kind !== "requirement") {
        rule.rules.forEach(visit);
        return;
      }
      if (
        rule.verified &&
        !data.evidence.some((e) => e.field === rule.evidenceKey && e.state === "verified")
      )
        ctx.addIssue({
          code: "custom",
          path: ["requirements"],
          message: `Checked rule ${rule.id} needs matching checked evidence.`,
        });
    }
    visit(data.requirements);
    for (const field of ["levels", "funding", "availability"])
      if (!data.evidence.some((e) => e.field === field))
        ctx.addIssue({
          code: "custom",
          path: ["evidence"],
          message: `Attach evidence or an explicit unknown state for ${field}.`,
        });
  });
export type ScholarshipData = z.infer<typeof scholarshipDataSchema>;
export const fundingLabels = {
  comprehensive: "Tuition + living support",
  tuition: "Tuition support",
  partial: "Partial funding",
  unknown: "Funding to confirm",
};
export function availabilityOf(
  data: { availability: string; deadline: Date | string | null; opensAt?: Date | string | null },
  now = new Date(),
) {
  if (data.deadline && new Date(data.deadline) <= now) return "closed";
  if (data.availability === "upcoming" && data.opensAt && new Date(data.opensAt) <= now)
    return data.deadline && new Date(data.deadline) > now ? "open" : "unknown";
  return data.availability;
}
