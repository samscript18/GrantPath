import { requireOperator, type Actor } from "@/server/accounts/auth";
import { runApplicationJobs } from "@/server/jobs/run";
export async function processOperatorJobs(actor: Actor, limit: number) {
  requireOperator(actor);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    throw new Error("Choose a job batch from1–20.");
  return runApplicationJobs(limit);
}
