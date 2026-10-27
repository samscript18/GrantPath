import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { matchesReviewedBackendSource } from "../../scripts/lib/native-source.mjs";
const prelude =
  '# Auto-injected credentials — redacted for security; set TESTSPRITE_AUTH_CREDENTIAL to run this locally\n__AUTH_CREDENTIAL__ = __import__("os").environ.get("TESTSPRITE_AUTH_CREDENTIAL", "")\n__AUTH_TYPE__ = "public"\n__EXTRA_HEADERS__ = {}\n__AUTH_HEADERS__ = {}\n';
const source = readFileSync("docs/testsprite/code/access_denial_api.py", "utf8");
describe("native backend reviewed source comparison", () => {
  it("accepts the exact observed public-auth export wrapper and EOF serialization", () => {
    expect(matchesReviewedBackendSource(source, source)).toBe(true);
    expect(matchesReviewedBackendSource(source.slice(0, -1), source)).toBe(true);
    expect(matchesReviewedBackendSource(prelude + source.slice(0, -1), source)).toBe(true);
  });
  it("rejects changed assertions, extra executable code, unknown wrappers and missing source", () => {
    expect(
      matchesReviewedBackendSource(prelude + source.replace("== 404", "== 200").trimEnd(), source),
    ).toBe(false);
    expect(
      matchesReviewedBackendSource(prelude + source.trimEnd() + '\nprint("extra")', source),
    ).toBe(false);
    expect(
      matchesReviewedBackendSource(
        prelude.replace('"public"', '"bearer"') + source.trimEnd(),
        source,
      ),
    ).toBe(false);
    expect(matchesReviewedBackendSource("# anything\n" + source, source)).toBe(false);
    expect(matchesReviewedBackendSource(undefined, source)).toBe(false);
  });
});
