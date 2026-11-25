import { parentPort, workerData } from "node:worker_threads";
import { getDocument, version } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

try {
  const task = getDocument({
    data: workerData,
    useWorkerFetch: false,
    disableFontFace: true,
    useSystemFonts: false,
    useWasm: false,
    stopAtErrors: true,
    maxImageSize: 0,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    standardFontDataUrl:
      join(
        dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")),
        "standard_fonts",
      ) + "/",
  });
  // Encrypted documents are unsupported; never wait for a password callback.
  task.onPassword = () => {
    void task.destroy();
  };
  const pdf = await task.promise;
  if (pdf.numPages > 30) throw new Error("PDF_PAGE_LIMIT");
  const pages = [];
  let length = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    length += text.length;
    if (length > 80000) throw new Error("PDF_TEXT_LIMIT");
    pages.push(text);
    page.cleanup();
  }
  const text = pages.join("\n").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (text.length < 30) throw new Error("PDF_TEXT_UNAVAILABLE");
  parentPort.postMessage({
    kind: "pdf-text",
    text,
    pages: pdf.numPages,
    parserVersion: `pdfjs-${version}`,
  });
  await task.destroy();
} catch (error) {
  parentPort.postMessage({
    error:
      error instanceof Error && /^PDF_[A-Z_]+$/.test(error.message)
        ? error.message
        : "PDF_PARSE_UNSUPPORTED",
  });
}
