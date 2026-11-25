import { writeFile, readFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { scholarshipDataSchema, availabilityOf } from "../src/server/scholarships/schema";
import {
  enrichApplicationWindow,
  parseOfficialDate,
  type WindowInput,
} from "../src/server/discovery/application-windows";
import { publicationPolicy } from "../src/server/discovery/policy";
import { publishScholarshipTx, semanticHash } from "../src/server/scholarships/publish";
const raw = process.env.GROWTH_DATABASE_URL;
if (
  !raw ||
  new URL(raw).hostname !== "127.0.0.1" ||
  new URL(raw).pathname !== "/grantpath_growth_test"
)
  throw Error("Explicit isolated catalogue required.");
process.env.DATABASE_URL = raw;
process.env.DATABASE_TRANSPORT = "tcp";
const apply = process.argv.includes("--apply");
const actor = {
  id: "service:development-window-review",
  name: "Development evidence reprocessing",
  email: "windows@example.test",
  role: "operator",
};
const now = new Date();
try {
  const rows = await db().scholarship.findMany({
    where: { published: true },
    include: {
      versions: { orderBy: { number: "desc" }, take: 1 },
      programme: { include: { provider: true } },
    },
    orderBy: { id: "asc" },
  });
  if (rows.length > 2000) throw Error("Bound exceeded");
  const before = Object.fromEntries(
    ["open", "upcoming", "closed", "unknown"].map((s) => [
      s,
      rows.filter((row) => availabilityOf(row) === s).length,
    ]),
  );
  const candidates = await db().discoveredCandidate.findMany({
    where: { scholarshipId: { not: null } },
  });
  const failures = new Map(
    candidates.filter((c) => c.state === "failed").map((c) => [c.scholarshipId, c.error]),
  );
  const groups: Record<string, string[]> = {};
  const results = [];
  for (const row of rows) {
    const previous = scholarshipDataSchema.parse(row.versions[0].data);
    const text = Object.entries(previous.sourceFacts || {})
      .filter(([key]) => /^(officialText|programme|fundingTerms)\d+$/.test(key))
      .map(([, value]) => value)
      .join("");
    const provider = row.programme.provider.slug;
    let input: WindowInput | undefined;
    if (provider === "imperial" || provider === "cambridge") {
      const label = text
        .match(
          /Application deadline\s*(.*?)(?:Additional information|Application results date)/,
        )?.[1]
        ?.trim();
      if (label)
        input = {
          closing: label.replace(/\s*Closed\s*$/, "").trim(),
          ...(label.endsWith("Closed") ? { status: "Closed" } : {}),
          dayFirst: provider === "imperial",
        };
    } else if (provider === "auckland") {
      const opening = text.match(/Opening date:\s*(.*?)\s*Closing date:/)?.[1];
      const closing = text.match(/Closing date:\s*(.*?)\s*Tenure:/)?.[1];
      if (opening || closing) input = { opening, closing };
    }
    // Match only explicit application wording; EOI, nomination and automatic
    // consideration are not direct rolling scholarship applications.
    const rolling = text.match(
      /Applications (?:are )?accepted (?:all year round|year-round|at any time)/i,
    )?.[0];
    if (!input && rolling && !/EOI|No application (?:is )?required|By nomination/i.test(text))
      input = { mode: rolling };
    if (provider === "anu" && text.includes("Application period is open all year round."))
      input = { mode: "Application period is open all year round." };
    const cause = failures.has(row.id)
      ? "inaccessible_detail_page"
      : input?.mode
        ? "rolling_applications"
        : /^(?:TBC|TBA|to be announced)$/i.test(input?.closing || "")
          ? "unannounced_cycle"
          : input?.closing && parseOfficialDate(input.closing, input.dayFirst)
            ? previous.recordKind === "overview"
              ? "scheme_overview_with_dates_but_no_confirmed_cycle"
              : "unsupported_date_format_or_unmapped_date_field"
            : /Same as funding deadline for the course/.test(input?.closing || "")
              ? "course_specific_supporting_page_required"
              : previous.recordKind === "overview"
                ? "scheme_overview_no_confirmed_cycle"
                : !text
                  ? "no_retained_detail_date_evidence"
                  : /closing|deadline|opening/i.test(text)
                    ? "unsupported_or_ambiguous_date_wording"
                    : "missing_official_dates";
    if (previous.availability === "unknown") (groups[cause] ||= []).push(row.id);
    if (!input) continue;
    let next = enrichApplicationWindow(
      previous,
      input,
      previous.officialUrl,
      previous.cycleStatus === "confirmed",
      now,
    );
    // Reprocessing is not a fresh retrieval. Retain the original evidence time.
    const retrievedAt = previous.evidence
      .filter((e) => e.state === "verified")
      .map((e) => e.retrievedAt)
      .sort()
      .at(-1);
    next = {
      ...next,
      evidence: next.evidence.map((e) =>
        ["applicationWindow", "availability", "deadline"].includes(e.field) && retrievedAt
          ? { ...e, retrievedAt }
          : e,
      ),
    };
    if (semanticHash(next) === semanticHash(previous)) continue;
    const candidate = candidates.find((c) => c.scholarshipId === row.id);
    if (!candidate) continue;
    const validation = {
      codes: [] as string[],
      structure: true,
      matchedFields: [
        ...new Set(next.evidence.filter((e) => e.state === "verified").map((e) => e.field)),
      ],
      cycleConfirmed: previous.cycleStatus === "confirmed",
      requirementsComplete: false,
    };
    const verdict = publicationPolicy({
      enabled: true,
      autoPublish: true,
      validation,
      candidate: next,
      previous,
    });
    let changed = false;
    if (apply)
      await db().$transaction(async (tx) => {
        const observation = await tx.discoveryObservation.create({
          data: {
            candidateId: candidate.id,
            retrievedAt: new Date(retrievedAt!),
            contentHash: semanticHash(text),
            adapterVersion: "application-window-reprocessing-1",
            schemaVersion: "scholarship-2.1.0",
            data: next,
            validation,
            excerpt: text.slice(0, 8000),
          },
        });
        let outcome;
        if (verdict.decision === "auto_publish")
          outcome = await publishScholarshipTx(
            tx,
            actor,
            row.id,
            next,
            row.version,
            "Reprocess retained verified official date fields; no fresh retrieval or inferred intake/timezone. Preserve accepted eligibility and funding.",
          );
        changed = !!outcome?.changed;
        await tx.publicationDecision.create({
          data: {
            observationId: observation.id,
            decision: verdict.decision,
            reasonCodes: verdict.codes,
            policyVersion: "publication-1.0.0",
            actorId: actor.id,
            scholarshipId: row.id,
            baseVersion: row.version,
            resultingVersion: outcome?.version,
            eventIds: outcome?.eventIds || [],
            before: previous,
            after: next,
          },
        });
      });
    results.push({
      id: row.id,
      title: row.title,
      cause,
      input,
      before: previous.availability,
      after: next.availability,
      windowKind: next.applicationWindow?.kind,
      decision: verdict.decision,
      reasons: verdict.codes,
      changed,
    });
  }
  const afterRows = await db().scholarship.findMany({ where: { published: true } });
  const after = Object.fromEntries(
    ["open", "upcoming", "closed", "unknown"].map((s) => [
      s,
      afterRows.filter((row) => availabilityOf(row) === s).length,
    ]),
  );
  const report = {
    checkedAt: now.toISOString(),
    apply,
    evidenceScope:
      "Previously accepted official evidence, original retrieval times preserved; no new source retrieval",
    total: rows.length,
    before,
    after,
    unknownCauses: Object.entries(groups).map(([cause, ids]) => ({
      cause,
      count: ids.length,
      ids,
    })),
    results,
  };
  const path = `docs/evidence/application-window-${apply ? "reprocessing" : "analysis"}.json`;
  // The initial diagnostic remains the 1,050-record baseline on subsequent runs.
  if (!apply) {
    try {
      await readFile(path);
    } catch {
      await writeFile(path, JSON.stringify(report, null, 2) + "\n");
    }
  } else await writeFile(path, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      ...report,
      unknownCauses: report.unknownCauses.map(({ cause, count }) => ({ cause, count })),
      results: results.map(({ id, decision, before, after, windowKind }) => ({
        id,
        decision,
        before,
        after,
        windowKind,
      })),
    }),
  );
} finally {
  await db().$disconnect();
}
