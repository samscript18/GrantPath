// Reversible relevance correction for a reviewed false positive, never a reset.
import { db } from "../src/lib/db";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated development catalogue required.");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const apply = process.argv.includes("--apply");
try {
  if (apply && (await db().user.count())) throw Error("Refusing correction with student accounts.");
  const candidate = await db().discoveredCandidate.findUnique({
    where: {
      directoryId_canonicalUrl: {
        directoryId: "ubc-graduate-awards",
        canonicalUrl: "https://www.grad.ubc.ca/awards/killam-connection",
      },
    },
  });
  const award = candidate?.scholarshipId
    ? await db().scholarship.findUniqueOrThrow({ where: { id: candidate.scholarshipId } })
    : null;
  if (award?.published && apply)
    await db().$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"directory:ubc-graduate-awards"}))`;
      const held = await tx.scholarship.updateMany({
        where: {
          id: award.id,
          title: "Killam Connection",
          version: award.version,
          published: true,
        },
        data: { published: false },
      });
      if (held.count !== 1) throw Error("Record changed during review; inspect again.");
      await tx.discoveredCandidate.update({
        where: { id: candidate!.id },
        data: {
          state: "review",
          error: "FACULTY_PROJECT_NOT_STUDENT_SCHOLARSHIP",
        },
      });
      await tx.audit.create({
        data: {
          actorId: "service:development-catalogue-growth",
          action: "discovery.student_relevance_hold",
          recordId: award.id,
          reason:
            "Official evidence states lead applicant must be a UBC-V faculty member and funding enables a faculty-led course. Hold outside the student scholarship catalogue; preserve records, immutable versions, observations and events.",
          before: { published: true, version: award.version },
          after: {
            published: false,
            version: award.version,
            reason: "FACULTY_PROJECT_NOT_STUDENT_SCHOLARSHIP",
          },
        },
      });
    });
  console.log(
    JSON.stringify({
      apply,
      id: award?.id,
      title: award?.title,
      previouslyPublished: award?.published,
    }),
  );
} finally {
  await db().$disconnect();
}
