import { expect, it } from "vitest";
import { parsePdfAnnouncement, pdfEvidenceHtml } from "../../src/server/discovery/pdf";
import { resolveDetailMapping } from "../../src/server/discovery/adapter-registry";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { extractDetail } from "../../src/server/discovery/adapters";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { sheffieldFixture } from "../fixtures/expansion";

// A minimal generated text PDF; no downloaded fixture or scanned-page inference.
function pdfFixture(text: string) {
  const lines = text.match(/.{1,70}(?:\s|$)/g) || [text];
  const stream = `BT /F1 10 Tf 12 TL 20 700 Td ${lines.map((line) => `(${line.replace(/([\\()])/g, "\\$1")}) Tj T*`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}

it("parses bounded PDF text in a worker and verifies a reviewed announcement mapping", async () => {
  const base = directoryDefinitions["sheffield-postgraduate-directory"];
  const html = sheffieldFixture("PDF");
  const htmlUrl = base.url + "/pdf-test";
  const mapping = resolveDetailMapping(base, htmlUrl, { kind: "html", text: html })!;
  const url = "https://sheffield.ac.uk/announcements/test-award.pdf";
  mapping.url = url;
  mapping.data.officialUrl = url;
  mapping.data.applicationUrl = url;
  mapping.data.evidence = mapping.data.evidence.map((e) => ({ ...e, url }));
  mapping.sections = undefined;
  const text = Object.values(mapping.passages).join(" ");
  const document = await parsePdfAnnouncement(pdfFixture(text));
  expect(document.pages).toBe(1);
  expect(document.parserVersion).toMatch(/^pdfjs-/);
  const definition = {
    ...base,
    detailFormat: "pdf" as const,
    dynamicDetail: "reviewed-pdf-announcement-1",
    mappings: [mapping],
  };
  const resolved = resolveDetailMapping(definition, url, document)!;
  expect(resolved).toBeDefined();
  const extraction = extractDetail(resolved, pdfEvidenceHtml(document.text), new Date(), {}, true);
  expect(extraction.validation.codes).toEqual([]);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: extraction.data,
      validation: extraction.validation,
    }).decision,
  ).toBe("auto_publish");
  expect(
    resolveDetailMapping(definition, url.replace("test-award", "unknown"), document),
  ).toBeUndefined();
  expect(resolveDetailMapping(definition, url, { kind: "html", text: html })).toBeUndefined();
  expect(() => resolveDetailMapping(definition, url, { ...document, pages: 31 })).toThrow(
    "PDF_PAGE_LIMIT",
  );
}, 15000);

it("rejects invalid, oversized and unsupported PDF documents", async () => {
  await expect(
    parsePdfAnnouncement(new Uint8Array(Buffer.from("<html>Not PDF</html>"))),
  ).rejects.toThrow("INVALID_PDF_SIGNATURE");
  await expect(parsePdfAnnouncement(new Uint8Array(2_000_001))).rejects.toThrow(
    "RESPONSE_TOO_LARGE",
  );
  await expect(
    parsePdfAnnouncement(new Uint8Array(Buffer.from("%PDF-1.4\nnot a real document"))),
  ).rejects.toThrow("PDF_PARSE_UNSUPPORTED");
  await expect(parsePdfAnnouncement(pdfFixture(""))).rejects.toThrow("PDF_TEXT_UNAVAILABLE");
}, 15000);
