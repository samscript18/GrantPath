import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { scholarshipDataSchema, availabilityOf } from "./schema";
export const filtersSchema = z.object({
  q: z.string().trim().max(120).default(""), destination: z.string().max(100).default(""), provider: z.string().max(100).default(""),
  level: z.enum(["", "bachelor", "master", "doctorate"]).default(""), field: z.string().max(100).default(""),
  funding: z.enum(["", "comprehensive", "tuition", "partial", "unknown"]).default(""),
  availability: z.enum(["active", "all", "open", "upcoming", "unknown", "closed"]).default("active"),
  deadlineBefore: z.union([z.iso.date(), z.literal("")]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export async function catalogue(input: unknown) {
  const parsed = filtersSchema.safeParse(input); const filters = parsed.success ? parsed.data : filtersSchema.parse({});
  const where: Prisma.ScholarshipWhereInput = { published: true };
  if (filters.q) where.OR = [{ title: { contains: filters.q, mode: "insensitive" } }, { programme: { provider: { name: { contains: filters.q, mode: "insensitive" } } } }, { field: { contains: filters.q, mode: "insensitive" } }];
  if (filters.destination) where.destination = { equals: filters.destination, mode: "insensitive" };
  if (filters.level) where.level = { contains: filters.level };
  if (filters.field) where.field = { contains: filters.field, mode: "insensitive" };
  if (filters.provider) where.programme = { provider: { slug: filters.provider } };
  if (filters.funding) where.fundingType = filters.funding;
  const now = new Date();
  if (filters.availability === "active") where.AND = [{ availability: { not: "closed" } }, { OR: [{ deadline: null }, { deadline: { gt: now } }] }];
  else if (filters.availability === "closed") where.AND = [{ OR: [{ availability: "closed" }, { deadline: { lte: now } }] }];
  else if (filters.availability !== "all") { where.availability = filters.availability; where.AND = [{ OR: [{ deadline: null }, { deadline: { gt: now } }] }]; }
  if (filters.deadlineBefore) where.deadline = { ...(typeof where.deadline === "object" ? where.deadline : {}), lt: new Date(`${filters.deadlineBefore}T00:00:00Z`) };
  const [rows, total, destinations, providers] = await Promise.all([
    db().scholarship.findMany({ where, include: { programme: { include: { provider: true } }, versions: { orderBy: { number: "desc" }, take: 1 }, sources: true }, orderBy: [{ title: "asc" }], skip: (filters.page - 1) * 8, take: 8 }),
    db().scholarship.count({ where }),
    db().scholarship.findMany({ where: { published: true }, select: { destination: true }, distinct: ["destination"], orderBy: { destination: "asc" } }),
    db().provider.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { rows: rows.map(s => ({ ...s, data: scholarshipDataSchema.parse(s.versions[0].data), currentAvailability: availabilityOf(s) })), total, filters, destinations, providers };
}
export async function scholarshipBySlug(slug: string) {
  const s = await db().scholarship.findUnique({ where: { slug, published: true }, include: { programme: { include: { provider: true } }, versions: { orderBy: { number: "desc" }, include: { evidence: true } }, sources: { include: { observations: { orderBy: { attemptedAt: "desc" }, take: 3 } } } } });
  if (!s) return null;
  return { ...s, data: scholarshipDataSchema.parse(s.versions[0].data), currentAvailability: availabilityOf(s) };
}
export type CatalogueRow = Awaited<ReturnType<typeof catalogue>>["rows"][number];
