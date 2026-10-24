import type { ScholarshipData } from "@/server/scholarships/schema";
export function evidenceHealth(data: ScholarshipData, now = new Date()) {
  const verified = data.evidence.filter(e => e.state === "verified");
  const lastVerified = verified.length ? new Date(Math.min(...verified.map(e => new Date(e.retrievedAt).getTime()))) : null;
  const conflicting = data.evidence.some(e => e.state === "conflicting");
  const uncertain = data.evidence.some(e => e.state !== "verified");
  const stale = !lastVerified || now.getTime() - lastVerified.getTime() > 7 * 86400000;
  return { lastVerified, conflicting, uncertain, stale };
}
