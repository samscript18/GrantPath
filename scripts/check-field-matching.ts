import "dotenv/config";
import { classifyFields } from "../src/server/scholarships/vertex-fields";
const candidates = [
  {
    id: "organic",
    title: "Organic synthesis research scholarship",
    fields: "Organic synthesis",
    summary: "Research in synthetic methods and the preparation of organic molecules.",
  },
  {
    id: "history",
    title: "Medieval history scholarship",
    fields: "History",
    summary: "Research on medieval historical archives.",
  },
  {
    id: "unknown",
    title: "Provider scholarship",
    fields: "Various fields",
    summary: "Approved subjects must be confirmed with the provider.",
  },
  {
    id: "all",
    title: "All disciplines postgraduate scholarship",
    fields: "All academic disciplines",
    summary: "Every academic discipline is supported with no subject exclusions.",
  },
];
try {
  const started = Date.now();
  const ids = await classifyFields("Chemistry", candidates);
  const passed =
    ids.includes("organic") &&
    ids.includes("all") &&
    !ids.includes("history") &&
    !ids.includes("unknown");
  const result = {
    check: "live Vertex Chemistry relevance",
    project: process.env.VERTEX_PROJECT_ID,
    model: process.env.VERTEX_MODEL || "gemini-3.8-flash",
    matchingIds: ids,
    passed,
    elapsedMs: Date.now() - started,
  };
  console.log(JSON.stringify(result));
  if (!passed) process.exitCode = 1;
} catch (error) {
  // Never print provider/auth error objects, request headers, or credential values.
  console.error(
    JSON.stringify({
      check: "live Vertex Chemistry relevance",
      passed: false,
      errorType: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error &&
        /^(Subject matching |Vertex returned |Vertex authentication unavailable)/.test(
          error.message,
        )
          ? error.message
          : "Could not complete Vertex request; check server credentials and project access.",
    }),
  );
  process.exitCode = 1;
}
