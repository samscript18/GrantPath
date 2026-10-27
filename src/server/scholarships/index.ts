import { countryCode, countryName } from "@/lib/countries";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { scholarshipDataSchema, availabilityOf } from "./schema";
import { normaliseScholarshipLinks } from "./links";
import { matchStudyField, type FieldMatching } from "./field-matching";
export const filtersSchema = z.object({
  q: z.string().trim().max(120).default(""),
  destination: z.string().max(100).default(""),
  provider: z.string().max(100).default(""),
  level: z.enum(["", "bachelor", "master", "doctorate"]).default(""),
  field: z.string().trim().max(100).default(""),
  funding: z.enum(["", "comprehensive", "tuition", "partial", "unknown"]).default(""),
  availability: z
    .enum(["active", "all", "open", "upcoming", "unknown", "closed"])
    .default("active"),
  deadlineBefore: z.union([z.iso.date(), z.literal("")]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export async function catalogue(input: unknown) {
  const parsed = filtersSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : filtersSchema.parse({});
  const where: Prisma.ScholarshipWhereInput = { published: true };
  if (filters.q)
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { programme: { provider: { name: { contains: filters.q, mode: "insensitive" } } } },
      { field: { contains: filters.q, mode: "insensitive" } },
    ];
  if (filters.destination) {
    const code = countryCode(filters.destination);
    where.destinationCodes = { has: code ?? "INVALID" };
  }
  if (filters.level) where.level = { contains: filters.level };
  if (filters.provider) where.programme = { provider: { slug: filters.provider } };
  if (filters.funding) where.fundingType = filters.funding;
  const now = new Date();
  if (filters.availability === "active")
    where.AND = [
      { availability: { not: "closed" } },
      { OR: [{ deadline: null }, { deadline: { gt: now } }] },
    ];
  else if (filters.availability === "closed")
    where.AND = [{ OR: [{ availability: "closed" }, { deadline: { lte: now } }] }];
  else if (filters.availability !== "all") {
    where.availability = filters.availability;
    where.AND = [{ OR: [{ deadline: null }, { deadline: { gt: now } }] }];
  }
  if (filters.deadlineBefore)
    where.deadline = {
      ...(typeof where.deadline === "object" ? where.deadline : {}),
      lt: new Date(`${filters.deadlineBefore}T00:00:00Z`),
    };
  let fieldMatching: FieldMatching | null = null;
  if (filters.field) {
    const candidates = await db().scholarship.findMany({
      where,
      orderBy: { id: "asc" },
      take: 161,
      select: {
        id: true,
        title: true,
        field: true,
        versions: { orderBy: { number: "desc" }, take: 1, select: { data: true } },
      },
    });
    const result =
      candidates.length > 160
        ? null
        : await matchStudyField(
            filters.field,
            candidates.map((candidate) => {
              const data = candidate.versions[0]?.data;
              const summary =
                data &&
                typeof data === "object" &&
                !Array.isArray(data) &&
                typeof data.summary === "string"
                  ? data.summary
                  : "";
              return { id: candidate.id, title: candidate.title, fields: candidate.field, summary };
            }),
          );
    if (result) where.id = { in: result.ids };
    else where.field = { contains: filters.field, mode: "insensitive" };
    fieldMatching = result?.mode ?? "text_only";
  }
  const [rows, total, destinations, providers] = await Promise.all([
    db().scholarship.findMany({
      where,
      include: {
        programme: { include: { provider: true } },
        versions: { orderBy: { number: "desc" }, take: 1 },
        sources: true,
      },
      orderBy: [{ title: "asc" }],
      skip: (filters.page - 1) * 8,
      take: 8,
    }),
    db().scholarship.count({ where }),
    db().scholarship.findMany({
      where: { published: true },
      select: { destinationCodes: true },
    }),
    db().provider.findMany({ orderBy: { name: "asc" } }),
  ]);
  return {
    rows: rows.map((s) => ({
      ...s,
      data: normaliseScholarshipLinks(
        s.programme.slug,
        scholarshipDataSchema.parse(s.versions[0].data),
      ),
      currentAvailability: availabilityOf(s),
    })),
    total,
    filters,
    fieldMatching,
    destinations: [...new Set(destinations.flatMap((row) => row.destinationCodes))]
      .map((code) => ({ code, destination: countryName(code)! }))
      .filter((item) => item.destination)
      .sort((a, b) => a.destination.localeCompare(b.destination)),
    providers,
  };
}
export async function scholarshipBySlug(slug: string) {
  const s = await db().scholarship.findUnique({
    where: { slug, published: true },
    include: {
      programme: { include: { provider: true } },
      versions: { orderBy: { number: "desc" }, include: { evidence: true } },
      sources: { include: { observations: { orderBy: { attemptedAt: "desc" }, take: 3 } } },
    },
  });
  if (!s) return null;
  const monitored = await db().discoveredCandidate.findMany({
    where: { scholarshipId: s.id },
    select: {
      id: true,
      state: true,
      directory: {
        select: { enabled: true, cadenceHours: true, lastAttemptAt: true, lastSuccessAt: true },
      },
      observations: {
        where: {
          decisions: {
            some: { decision: { in: ["auto_publish", "unchanged", "manual_publish"] } },
          },
        },
        orderBy: { retrievedAt: "desc" },
        take: 1,
        select: { retrievedAt: true },
      },
    },
  });
  return {
    ...s,
    monitored,
    data: normaliseScholarshipLinks(
      s.programme.slug,
      scholarshipDataSchema.parse(s.versions[0].data),
    ),
    currentAvailability: availabilityOf(s),
  };
}
export type CatalogueRow = Awaited<ReturnType<typeof catalogue>>["rows"][number];
export async function featuredScholarships() {
  const rows = await db().scholarship.findMany({
    where: {
      published: true,
      availability: { in: ["open", "upcoming"] },
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
    },
    include: {
      programme: { include: { provider: true } },
      versions: { orderBy: { number: "desc" }, take: 1 },
      sources: true,
    },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    take: 30,
  });
  const providers = new Set<string>();
  return rows
    .filter((row) => {
      if (providers.has(row.programme.providerId)) return false;
      providers.add(row.programme.providerId);
      return true;
    })
    .slice(0, 3)
    .map((row) => ({
      ...row,
      data: normaliseScholarshipLinks(
        row.programme.slug,
        scholarshipDataSchema.parse(row.versions[0].data),
      ),
      currentAvailability: availabilityOf(row),
    }));
}
