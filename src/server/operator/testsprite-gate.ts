export function assessNativeReport(
  status: { state: string; description: string | null },
  expectedCases: number,
): { state: "pending" | "passed" | "failed"; reason: string } {
  if (status.state === "pending")
    return { state: "pending", reason: "Native execution is still pending." };
  if (status.state !== "success")
    return { state: "failed", reason: "Native App status failed or errored." };
  const description = status.description || "";
  const counts = description.match(/^\s*(\d+)\/(\d+)\s+passed\b/i);
  if (!counts || Number(counts[1]) !== expectedCases || Number(counts[2]) !== expectedCases)
    return {
      state: "failed",
      reason: `App summary does not establish all ${expectedCases} cases passed: ${description}`,
    };
  if (/(?:[1-9]\d*\s+(?:failed|blocked|skipped)|\b(?:error|cancelled)\b)/i.test(description))
    return {
      state: "failed",
      reason: "Native execution includes failed, blocked, skipped or errored cases.",
    };
  return { state: "passed", reason: `All ${expectedCases} native cases reported passed.` };
}
