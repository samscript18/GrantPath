import { z } from "zod";
const text = z.string().trim().max(150);
const date = z.iso.date();
export const profileSchema = z.object({
  citizenships: z.array(text.min(2)).max(10).default([]),
  residence: text.optional(),
  timeZone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Choose a valid IANA time zone").default("Africa/Lagos"),
  qualification: z.enum(["secondary", "bachelor", "master", "doctorate"]).optional(),
  completion: z.enum(["completed", "final_year", "in_progress"]).optional(),
  graduationDate: date.optional(),
  currentField: text.optional(),
  institution: text.optional(),
  targetLevel: z.enum(["bachelor", "master", "doctorate"]).optional(),
  targetField: text.optional(),
  destinations: z.array(text.min(2)).max(20).default([]),
  preferredInstitutions: z.array(text).max(20).default([]),
  intendedStart: date.optional(),
  gpa: z.object({ value: z.number().min(0), scale: z.number().positive().max(100), classification: text.optional() }).refine(g => g.value <= g.scale, { message: "Result cannot exceed its original scale", path: ["value"] }).optional(),
  language: z.object({ type: z.enum(["IELTS", "TOEFL", "Other"]), score: z.number().min(0), takenAt: date }).superRefine((v, ctx) => {
    const max = v.type === "IELTS" ? 9 : v.type === "TOEFL" ? 120 : 1000;
    if (v.score > max) ctx.addIssue({ code: "custom", path: ["score"], message: `Maximum ${v.type} score is ${max}` });
  }).optional(),
  englishMedium: z.boolean().optional(),
  experienceMonths: z.number().int().min(0).max(720).optional(),
  birthDate: date.optional(),
  admission: z.enum(["none", "applied", "conditional", "unconditional"]).optional(),
  fundingNeed: z.enum(["full", "tuition", "any"]).default("any"),
  acceptPartial: z.boolean().default(true),
}).strict();
export type StudentProfile = z.infer<typeof profileSchema>;
export const emptyProfile = () => profileSchema.parse({});
