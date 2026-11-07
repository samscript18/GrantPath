// Native backend exports prepend this exact public-auth stub and remove the final newline.
// Accept only that observed representation; never strip arbitrary imports or executable code.
const publicPrelude =
  "# Auto-injected credentials — redacted for security; set TESTSPRITE_AUTH_CREDENTIAL to run this locally\n" +
  '__AUTH_CREDENTIAL__ = __import__("os").environ.get("TESTSPRITE_AUTH_CREDENTIAL", "")\n' +
  '__AUTH_TYPE__ = "public"\n' +
  "__EXTRA_HEADERS__ = {}\n" +
  "__AUTH_HEADERS__ = {}\n";
/** @param {unknown} exported @param {string} reviewed */
export function matchesReviewedBackendSource(exported, reviewed) {
  if (typeof exported !== "string") return false;
  const body = reviewed.endsWith("\n") ? reviewed.slice(0, -1) : reviewed;
  return exported === reviewed || exported === body || exported === publicPrelude + body;
}
