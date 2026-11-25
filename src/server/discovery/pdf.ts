import { Worker } from "node:worker_threads";
import type { SourceDocument } from "./adapter-registry";

export async function parsePdfAnnouncement(
  bytes: Uint8Array,
): Promise<Extract<SourceDocument, { kind: "pdf-text" }>> {
  if (bytes.byteLength > 2_000_000) throw new Error("RESPONSE_TOO_LARGE");
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("INVALID_PDF_SIGNATURE");
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(new URL("./pdf-parser.mjs", import.meta.url), {
      workerData: new Uint8Array(bytes),
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
    });
    const timer = setTimeout(() => {
      settled = true;
      void worker.terminate();
      reject(new Error("PDF_PARSE_TIMEOUT"));
    }, 10000);
    worker.once("message", (result) => {
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (result.error) reject(new Error(result.error));
      else resolve(result);
    });
    worker.once("error", () => {
      settled = true;
      clearTimeout(timer);
      reject(new Error("PDF_PARSE_UNSUPPORTED"));
    });
    worker.once("exit", () => {
      clearTimeout(timer);
      if (!settled) reject(new Error("PDF_PARSE_UNSUPPORTED"));
    });
  });
}

export function pdfEvidenceHtml(text: string) {
  return `<main><pre>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></main>`;
}
