import type { Prisma } from "@/generated/prisma/client";

/** Calendar dates retain their uncertainty across all world timezones. */
export function availabilityWhere(
  status: "active" | "open" | "upcoming" | "closed" | "unknown",
  now = new Date(),
): Prisma.ScholarshipWhereInput {
  const ended = new Date(now.getTime() - 38 * 3600000).toISOString().slice(0, 10);
  const starting = new Date(now.getTime() + 14 * 3600000).toISOString().slice(0, 10);
  const closed: Prisma.ScholarshipWhereInput = {
    OR: [
      { availability: "closed" },
      { deadline: { lte: now } },
      { deadline: null, windowClosesOn: { lte: ended } },
    ],
  };
  const active: Prisma.ScholarshipWhereInput = {
    AND: [
      { availability: { not: "closed" } },
      {
        OR: [
          { deadline: { gt: now } },
          { deadline: null, OR: [{ windowClosesOn: null }, { windowClosesOn: { gt: ended } }] },
        ],
      },
    ],
  };
  const certain: Prisma.ScholarshipWhereInput = {
    OR: [
      { deadline: { gt: now } },
      { deadline: null, OR: [{ windowClosesOn: null }, { windowClosesOn: { gt: starting } }] },
    ],
  };
  const passed: Prisma.ScholarshipWhereInput = {
    OR: [
      { opensAt: { lte: now }, deadline: { gt: now } },
      { opensAt: null, windowOpensOn: { lte: ended }, windowClosesOn: { gt: starting } },
    ],
  };
  const open: Prisma.ScholarshipWhereInput = {
    AND: [
      active,
      certain,
      { OR: [{ availability: "open" }, { availability: "upcoming", ...passed }] },
    ],
  };
  const upcoming: Prisma.ScholarshipWhereInput = {
    AND: [
      active,
      certain,
      { availability: "upcoming" },
      {
        OR: [
          { opensAt: { gt: now } },
          { opensAt: null, OR: [{ windowOpensOn: null }, { windowOpensOn: { gt: starting } }] },
        ],
      },
    ],
  };
  if (status === "closed") return closed;
  if (status === "active") return active;
  if (status === "open") return open;
  if (status === "upcoming") return upcoming;
  return {
    AND: [
      active,
      {
        OR: [
          { availability: "unknown" },
          { deadline: null, windowClosesOn: { gt: ended, lte: starting } },
          { availability: "upcoming", opensAt: { lte: now }, deadline: null },
          {
            availability: "upcoming",
            opensAt: null,
            OR: [
              { windowOpensOn: { gt: ended, lte: starting } },
              { windowOpensOn: { lte: ended }, windowClosesOn: null },
            ],
          },
        ],
      },
    ],
  };
}
