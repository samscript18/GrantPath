import { z } from "zod";
import { canonicalCountry } from "@/lib/countries";
const text = z.string().trim().max(150);
const date = z.iso.date();
const country = text
  .refine(
    (v) => !!canonicalCountry(v),
    "Choose a recognised country name or ISO code; ambiguous nationality descriptions need correction.",
  )
  .transform((v) => canonicalCountry(v)!);
const emptyGroup = (v: unknown) =>
  v && typeof v === "object" && Object.values(v).every((x) => x === undefined || x === "")
    ? undefined
    : v;
export const profileSchema = z
  .object({
    citizenships: z.array(country).max(10).default([]),
    residence: country.optional(),
    timeZone: z
      .string()
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid IANA time zone")
      .default("Africa/Lagos"),
    qualification: z.enum(["secondary", "bachelor", "master", "doctorate"]).optional(),
    completedQualifications: z
      .array(z.enum(["secondary", "bachelor", "master", "doctorate"]))
      .max(4)
      .default([]),
    qualificationHistoryComplete: z.boolean().default(false),
    completion: z.enum(["completed", "final_year", "in_progress"]).optional(),
    graduationDate: date.optional(),
    degreeClassification: text.optional(),
    currentField: text.optional(),
    institution: text.optional(),
    targetLevel: z.enum(["bachelor", "master", "doctorate"]).optional(),
    targetField: text.optional(),
    destinations: z.array(text.min(2)).max(20).default([]),
    preferredInstitutions: z.array(text).max(20).default([]),
    intendedStart: date.optional(),
    gpa: z.preprocess(
      emptyGroup,
      z
        .object({
          value: z.number().min(0),
          scale: z.number().positive().max(100),
          classification: text.optional(),
        })
        .refine((g) => g.value <= g.scale, {
          message: "Result cannot exceed its original scale",
          path: ["value"],
        })
        .optional(),
    ),
    language: z.preprocess(
      emptyGroup,
      z
        .object({
          type: z.enum(["IELTS", "TOEFL", "Other"]),
          score: z.number().min(0),
          takenAt: date,
        })
        .superRefine((v, ctx) => {
          const max = v.type === "IELTS" ? 9 : v.type === "TOEFL" ? 120 : 1000;
          if (v.score > max)
            ctx.addIssue({
              code: "custom",
              path: ["score"],
              message: `Maximum ${v.type} score is ${max}`,
            });
        })
        .optional(),
    ),
    englishMedium: z.boolean().optional(),
    experienceHours: z.number().min(0).max(500000).optional(),
    experienceMonths: z.number().int().min(0).max(720).optional(),
    birthDate: date.optional(),
    admission: z.enum(["none", "applied", "conditional", "unconditional"]).optional(),
    fundingNeed: z.enum(["full", "tuition", "any"]).default("any"),
    acceptPartial: z.boolean().default(true),
  })
  .strict()
  .superRefine((p, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (p.birthDate && p.birthDate > today)
      ctx.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "Date of birth cannot be in the future.",
      });
    if (p.language?.takenAt && p.language.takenAt > today)
      ctx.addIssue({
        code: "custom",
        path: ["language", "takenAt"],
        message: "A recorded test result needs a test date that has already occurred.",
      });
    if (p.completion === "completed" && p.graduationDate && p.graduationDate > today)
      ctx.addIssue({
        code: "custom",
        path: ["graduationDate"],
        message:
          "A completed qualification cannot have a future completion date. Choose final year or in progress.",
      });
  });
export type StudentProfile = z.infer<typeof profileSchema>;
export const emptyProfile = () => profileSchema.parse({});
