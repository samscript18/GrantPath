import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { configureDirectory } from "../src/server/discovery/service";
import { checkCandidate, checkDirectory } from "../src/server/discovery/worker";
import { parseOfficialDate } from "../src/server/discovery/application-windows";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated development catalogue required.");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const actor = {
  id: "service:development-current-calls",
  name: "Development operator",
  email: "calls@example.test",
  role: "operator",
};
const now = new Date(),
  today = now.toISOString().slice(0, 10);
const allowed = ["uq-scholarships", "auckland-scholarships"];
const args = process.argv.slice(2),
  requested =
    args
      .find((a) => a.startsWith("--sources="))
      ?.split("=")[1]
      ?.split(",") || allowed;
if (requested.some((id) => !allowed.includes(id))) throw Error("Unsupported source batch.");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || 50);
if (!Number.isInteger(limit) || limit < 1 || limit > 60) throw Error("Use a 1–60 candidate bound.");
const rows = await db().scholarship.findMany({
  where: { published: true },
  include: { versions: { orderBy: { number: "desc" }, take: 1 }, programme: true },
});
const before = {
  records: rows.length,
  programmes: new Set(rows.map((r) => r.programmeId)).size,
  availability: await db().scholarship.groupBy({
    by: ["availability"],
    where: { published: true },
    _count: true,
  }),
  review: await db().discoveredCandidate.count({ where: { state: "review" } }),
};
const results: Record<string, unknown> = {};
const activated: string[] = [];
const path = `.local/growth/current-call-batch-${now.toISOString().replace(/[:.]/g, "-")}.json`;
async function save() {
  await writeFile(
    path,
    JSON.stringify({ startedAt: now.toISOString(), before, results }, null, 2) + "\n",
  );
}
try {
  const outcomes = await Promise.allSettled(
    requested.map(async (id) => {
      const provider = id === "uq-scholarships" ? "queensland" : "auckland";
      const targets = rows
        .filter((r) => r.programme.slug.startsWith(provider + "-") && r.versions[0]?.data)
        .map((r) => {
          const d = r.versions[0].data as {
            officialUrl: string;
            levels: string[];
            sourceFacts?: Record<string, string>;
          };
          const text = Object.entries(d.sourceFacts || {})
            .filter(([k]) => /^officialText\d+$/.test(k))
            .map(([, v]) => v)
            .join("");
          const date =
            "(\\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) 20\\d{2})";
          const m = text.match(
            new RegExp(
              id === "uq-scholarships"
                ? `Applications open\\s*${date}\\s*Applications close\\s*${date}`
                : `Opening date:\\s*${date}\\s*Closing date:\\s*${date}`,
            ),
          );
          return {
            url: d.officialUrl,
            opening: m && parseOfficialDate(m[1]),
            closing: m && parseOfficialDate(m[2]),
            priority:
              (d.levels.includes("doctorate") ? 4 : d.levels.includes("master") ? 2 : 0) +
              (/International/.test(text) ? 1 : 0),
          };
        })
        .filter((r) => r.opening && r.closing && r.closing > today && r.opening <= "2027-12-31")
        .sort((a, b) => b.priority - a.priority || a.closing!.localeCompare(b.closing!));
      const unique = [...new Map(targets.map((t) => [t.url, t])).values()].slice(0, limit);
      await configureDirectory(actor, id, {
        enabled: true,
        autoPublish: true,
        reason:
          "Owner-authorized bounded current application-round discovery in isolated development; preserve programme identities and historical cycles.",
      });
      activated.push(id);
      const access = new Map(),
        listing = await checkDirectory(id, access),
        decisions: Record<string, unknown>[] = [];
      results[id] = { listing, shortlisted: unique.length, decisions };
      await save();
      for (const target of unique) {
        const candidate = await db().discoveredCandidate.findUnique({
          where: { directoryId_canonicalUrl: { directoryId: id, canonicalUrl: target.url } },
        });
        if (!candidate) continue;
        const decision = await checkCandidate(candidate.id, access);
        decisions.push({ url: target.url, ...decision });
        console.log(JSON.stringify({ source: id, ...decisions.at(-1) }));
        await save();
      }
      const accepted = decisions.find((r) => r.state === "auto_publish");
      if (accepted && "scholarshipId" in accepted && typeof accepted.scholarshipId === "string") {
        const count = () =>
          db().scholarshipVersion.count({
            where: { scholarshipId: accepted.scholarshipId as string },
          });
        const events = () =>
          db().outbox.count({
            where: { key: { startsWith: `scholarship:${accepted.scholarshipId}:` } },
          });
        const versionsBefore = await count(),
          eventsBefore = await events();
        const replay = await checkCandidate(accepted.id as string, access);
        results[id] = {
          ...(results[id] as object),
          replay: {
            ...replay,
            versionsBefore,
            versionsAfter: await count(),
            eventsBefore,
            eventsAfter: await events(),
          },
        };
        await save();
      }
    }),
  );
  const rejected = outcomes.filter((result) => result.status === "rejected");
  if (rejected.length)
    throw new AggregateError(
      rejected.map((result) => result.reason),
      "Current-call source batch failed; all started sources have settled.",
    );
} finally {
  for (const id of activated)
    await configureDirectory(actor, id, {
      enabled: false,
      autoPublish: false,
      reason:
        "Bounded current-call batch finished; isolated retrieval and automatic publication paused.",
    });
  await save();
  await db().$disconnect();
}
