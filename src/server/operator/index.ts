import { z } from "zod";
import { db } from "@/lib/db";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { publishScholarship } from "@/server/scholarships/publish";
const createSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,100}$/),
    cycle: z.string().min(2).max(100),
    programmeSlug: z.string().regex(/^[a-z0-9-]{3,100}$/),
    providerSlug: z.string().regex(/^[a-z0-9-]{3,100}$/),
    providerName: z.string().min(3).max(160),
    providerUrl: z.url().refine((v) => v.startsWith("https://")),
    data: z.unknown(),
    reason: z.string().min(10).max(1000),
  })
  .strict();
export async function createOpportunity(actor: Actor, input: unknown) {
  requireOperator(actor);
  const v = createSchema.parse(input);
  const provider = await db().provider.upsert({
    where: { slug: v.providerSlug },
    create: { slug: v.providerSlug, name: v.providerName, url: v.providerUrl },
    update: {},
  });
  const programme = await db().programme.upsert({
    where: { slug: v.programmeSlug },
    create: { slug: v.programmeSlug, name: v.programmeSlug, providerId: provider.id },
    update: {},
  });
  if (programme.providerId !== provider.id)
    throw new Error("Programme belongs to a different provider.");
  const record = await db().scholarship.upsert({
    where: { programmeId_cycle: { programmeId: programme.id, cycle: v.cycle } },
    create: {
      slug: v.slug,
      programmeId: programme.id,
      cycle: v.cycle,
      title: "Pending review",
      destination: "Unconfirmed",
      level: "",
      field: "",
      fundingType: "unknown",
    },
    update: {},
  });
  if (record.version)
    throw new Error("This programme cycle already exists. Edit its accepted version instead.");
  const result = await publishScholarship(actor, record.id, v.data, 0, v.reason);
  return { ...result, id: record.id, slug: record.slug };
}
export async function operatorOverview(actor: Actor) {
  requireOperator(actor);
  const [scholarships, sources, reviews, failures, events, audits] = await Promise.all([
    db().scholarship.findMany({
      include: {
        programme: { include: { provider: true } },
        versions: { orderBy: { number: "desc" }, take: 1 },
      },
      orderBy: { title: "asc" },
    }),
    db().source.findMany({
      include: { scholarship: true, observations: { orderBy: { attemptedAt: "desc" }, take: 5 } },
      orderBy: { url: "asc" },
    }),
    db().review.findMany({
      where: { state: "pending" },
      include: { scholarship: true, observation: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    db().delivery.findMany({
      where: { state: { in: ["failed", "pending", "processing", "uncertain"] } },
      include: { history: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db().outbox.findMany({
      where: { state: { not: "done" } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db().audit.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { scholarships, sources, reviews, failures, events, audits };
}
