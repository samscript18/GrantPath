import type { ScholarshipData } from "../scholarships/schema";
import { parseClosingInstant } from "../monitoring/adapters";

const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// No year completion, Date.parse locale guessing, or inferred time zone.
export function parseOfficialDate(raw: string, dayFirst = false): string | null {
  const text = raw.trim();
  let year: number, month: number, day: number;
  const iso = text.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  const numeric = dayFirst && text.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
  const words = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})$/i,
  );
  if (iso) [year, month, day] = [+iso[1], +iso[2], +iso[3]];
  else if (numeric) [year, month, day] = [+numeric[3], +numeric[2], +numeric[1]];
  else if (words)
    [year, month, day] = [
      +words[3],
      months.indexOf(words[2].slice(0, 3).toLowerCase()) + 1,
      +words[1],
    ];
  else {
    const monthFirst = text.match(
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})$/i,
    );
    if (!monthFirst) return null;
    [year, month, day] = [
      +monthFirst[3],
      months.indexOf(monthFirst[1].slice(0, 3).toLowerCase()) + 1,
      +monthFirst[2],
    ];
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}
export type WindowInput = {
  opening?: string;
  closing?: string;
  status?: string;
  mode?: string;
  dayFirst?: boolean;
  sourceHash?: string;
};
export function parseApplicationInstant(raw: string): string | null {
  const common = parseClosingInstant(raw);
  if (common) return common;
  // This city/timezone association is explicitly printed by the reviewed
  // provider. Never use the provider's location as an implicit timezone.
  const m = raw.match(
    /^(\d{2})\.(\d{2})\.(20\d{2}) at (\d{1,2}):(\d{2})\s*(am|pm) Helsinki time$/i,
  );
  if (
    !m ||
    !parseOfficialDate(`${m[1]}/${m[2]}/${m[3]}`, true) ||
    +m[4] < 1 ||
    +m[4] > 12 ||
    +m[5] > 59
  )
    return null;
  const hour = (+m[4] % 12) + (m[6].toLowerCase() === "pm" ? 12 : 0);
  const desired = Date.UTC(+m[3], +m[2] - 1, +m[1], hour, +m[5]);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(desired)).map((p) => [p.type, p.value]),
  );
  const rendered = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  const result = new Date(desired - (rendered - desired));
  const verified = Object.fromEntries(
    formatter.formatToParts(result).map((p) => [p.type, p.value]),
  );
  if (
    +verified.year !== +m[3] ||
    +verified.month !== +m[2] ||
    +verified.day !== +m[1] ||
    +verified.hour !== hour ||
    +verified.minute !== +m[5]
  )
    return null;
  return result.toISOString();
}
export function interpretApplicationWindow(
  input: WindowInput,
  cycleConfirmed: boolean,
  now = new Date(),
) {
  const opensOn = input.opening ? parseOfficialDate(input.opening, input.dayFirst) : null;
  const closesOn = input.closing ? parseOfficialDate(input.closing, input.dayFirst) : null;
  const instant = input.closing ? parseApplicationInstant(input.closing) : null;
  const openingInstant = input.opening ? parseApplicationInstant(input.opening) : null;
  const rolling =
    /^(?:rolling applications|applications (?:are )?accepted (?:all year round|year-round|at any time)|open all year round|Application period is open all year round\.)$/i.test(
      input.mode || "",
    );
  const unannounced = /^(?:TBC|TBA|to be (?:announced|confirmed)|not yet announced)$/i.test(
    input.closing || "",
  );
  const conflicting = !!(
    (opensOn && closesOn && opensOn > closesOn) ||
    (openingInstant && instant && openingInstant >= instant)
  );
  const kind = conflicting
    ? "unknown"
    : rolling
      ? "rolling"
      : unannounced
        ? "unannounced"
        : opensOn || closesOn || instant || openingInstant
          ? "fixed"
          : "unknown";
  let availability: ScholarshipData["availability"] = "unknown";
  // A date-only deadline is certainly past only after the date has ended in
  // every civil time zone. This is a bound, never a fabricated closing instant.
  const afterClosingDay =
    closesOn && now.getTime() >= Date.parse(closesOn + "T00:00:00Z") + 38 * 3600000;
  const beforeOpeningDay =
    opensOn && now.getTime() < Date.parse(opensOn + "T00:00:00Z") - 14 * 3600000;
  const afterOpeningDay =
    opensOn && now.getTime() >= Date.parse(opensOn + "T00:00:00Z") + 38 * 3600000;
  const beforeClosingDay =
    closesOn && now.getTime() < Date.parse(closesOn + "T00:00:00Z") - 14 * 3600000;
  if (cycleConfirmed && !conflicting) {
    if (
      afterClosingDay ||
      (instant && new Date(instant) <= now) ||
      /^Closed|^Applications (?:are )?closed$/i.test(input.status || "")
    )
      availability = "closed";
    else if (beforeOpeningDay || (openingInstant && new Date(openingInstant) > now))
      availability = "upcoming";
    else if (
      (afterOpeningDay ||
        (openingInstant && new Date(openingInstant) <= now) ||
        /^Open$|^Applications (?:are )?open$|^Applications for [^.]{3,180} are now open\.$/i.test(
          input.status || "",
        )) &&
      (beforeClosingDay || (instant && new Date(instant) > now))
    )
      availability = "open";
  }
  return { kind, opensOn, closesOn, instant, openingInstant, availability, conflicting } as const;
}

export function enrichApplicationWindow(
  data: ScholarshipData,
  input: WindowInput,
  sourceUrl: string,
  cycleConfirmed: boolean,
  now = new Date(),
): ScholarshipData {
  const parsed = interpretApplicationWindow(input, cycleConfirmed, now);
  if (data.deadline && !parsed.instant) return data;
  if (parsed.kind === "unknown" && !parsed.conflicting) return data;
  const passages = [input.opening, input.closing, input.status, input.mode].filter(
    (s): s is string => !!s,
  );
  const evidence = data.evidence.filter(
    (e) =>
      ![
        "applicationWindow",
        ...(parsed.availability !== "unknown" ? ["availability"] : []),
        ...(cycleConfirmed && input.closing ? ["deadline"] : []),
      ].includes(e.field),
  );
  for (const passage of passages)
    evidence.push({
      field: "applicationWindow",
      passage,
      url: sourceUrl,
      state: parsed.conflicting ? "conflicting" : "verified",
      retrievedAt: now.toISOString(),
    });
  if (parsed.availability !== "unknown")
    for (const passage of passages)
      evidence.push({
        field: "availability",
        passage,
        url: sourceUrl,
        state: "verified",
        retrievedAt: now.toISOString(),
      });
  if (cycleConfirmed && input.closing)
    evidence.push({
      field: "deadline",
      passage: input.closing,
      url: sourceUrl,
      state: "verified",
      retrievedAt: now.toISOString(),
    });
  return {
    ...data,
    applicationWindow: {
      kind: parsed.kind,
      opensOn: parsed.opensOn,
      closesOn: parsed.closesOn,
      ...(input.sourceHash ? { sourceHash: input.sourceHash } : {}),
    },
    availability: parsed.availability !== "unknown" ? parsed.availability : data.availability,
    ...(cycleConfirmed && parsed.openingInstant ? { opensAt: parsed.openingInstant } : {}),
    ...(cycleConfirmed && input.closing && !parsed.conflicting
      ? {
          deadline: parsed.instant || data.deadline,
          deadlineState: parsed.instant
            ? "confirmed"
            : parsed.closesOn
              ? "date_only"
              : data.deadlineState,
          deadlineLabel: input.closing.slice(0, 300),
        }
      : {}),
    evidence,
  };
}
