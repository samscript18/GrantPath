import { describe, expect, it } from "vitest";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import {
  createAdapterRegistry,
  resolveDetailMapping,
} from "../../src/server/discovery/adapter-registry";
import { extractDetail, extractDirectory } from "../../src/server/discovery/adapters";
import { extractRegisteredDirectory } from "../../src/server/discovery/directory-adapters";
import { canonicalDiscoveryUrl, allowedDiscoveryUrl } from "../../src/server/discovery/urls";
import { extractStructuredMetadata } from "../../src/server/discovery/structured-metadata";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { cscFixture, sheffieldFixture } from "../fixtures/expansion";

const sheffield = directoryDefinitions["sheffield-postgraduate-directory"];
const csc = directoryDefinitions["csc-degree-directory"];
const url = sheffield.url + "/unseen-award";
const resolve = (html: string) =>
  resolveDetailMapping(sheffield, url, { kind: "html", text: html });

describe("registered official-source templates", () => {
  it("extracts a previously unknown route with evidence and explicitly unknown fields", () => {
    const html = sheffieldFixture("award");
    const mapping = resolve(html)!;
    expect(mapping).toBeDefined();
    expect(mapping.cycle).toBe("2032/33");
    expect(mapping.data).toMatchObject({
      deadline: null,
      availability: "unknown",
      fundingType: "unknown",
      levels: ["master"],
    });
    const extracted = extractDetail(mapping, html);
    expect(
      publicationPolicy({
        enabled: true,
        autoPublish: true,
        candidate: extracted.data,
        validation: extracted.validation,
      }).decision,
    ).toBe("auto_publish");
    expect(mapping.data.sourceFacts?.officialText1).toContain("citizenship");
    expect(mapping.data.evidence.some((e) => e.passage.includes("Invited students"))).toBe(true);
  });
  it("uses doctoral purpose rather than a prior master's admission qualification", () => {
    const mapping = resolveDetailMapping(csc, csc.url + "commonwealth-unseen-phd-scholarships/", {
      kind: "html",
      text: cscFixture(),
    })!;
    expect(mapping.data.levels).toEqual(["doctorate"]);
    expect(extractDetail(mapping, cscFixture()).validation.codes).toEqual([]);
  });
  it("fails closed on missing sections, uncertain identity and ambiguous cycles", () => {
    for (const html of [
      sheffieldFixture("award").replace("Eligibility", "Changed layout"),
      sheffieldFixture("award").replaceAll("University of Sheffield", "Different university"),
      sheffieldFixture("award") + "<main><h1>Second main</h1></main>",
      sheffieldFixture("award").replace(
        "Closing dates require confirmation.",
        "The 2033/34 academic year also applies.",
      ),
    ])
      expect(resolve(html)).toBeUndefined();
    const changed = sheffieldFixture("award").replace(
      "<html>",
      `<html><link rel="canonical" href="${sheffield.url}/different-award">`,
    );
    expect(extractDetail(resolve(changed)!, changed).validation.codes).toContain(
      "UNSAFE_SOURCE_IDENTITY",
    );
  });
  it("keeps unconfirmed schemes stable when date wording changes", () => {
    const html = sheffieldFixture("award").replace("2032-33 academic year", "unconfirmed intake");
    expect(resolve(html)?.cycle).toBe("Scheme overview — cycle unconfirmed");
    expect(resolve(html)?.data.recordKind).toBe("overview");
    expect(
      resolve(html.replace("Closing dates require confirmation.", "Apply before 2 May 2033."))?.key,
    ).toBe(resolve(html)?.key);
  });
  it("classifies links, excludes supporting navigation and bounds pagination", () => {
    const html = `<h1>Scholarships</h1><article>${["commonwealth-new-scholarships/", "commonwealth-new-scholarships/?utm_source=test#top", "commonwealth-masters-scholarships/", "commonwealth-fellowships-information/"].map((path) => `<h2 class="entry-title"><a href="${csc.url + path}">Link</a></h2>`).join("")}</article><div class="pagination"><a href="/scholarships/page/2/">Next</a><a href="https://evil.test/scholarships/page/2/">Unsafe</a></div>`;
    expect(extractDirectory(csc, html)).toMatchObject({
      links: [csc.url + "commonwealth-new-scholarships/"],
      next: [csc.url + "page/2/"],
      excluded: 2,
    });
    expect(() =>
      extractRegisteredDirectory({ ...csc, directoryAdapter: "unknown" }, html, csc.url),
    ).toThrow("UNSUPPORTED_DIRECTORY_ADAPTER");
  });
  it("rejects unknown media and duplicate adapter registrations", () => {
    expect(
      resolveDetailMapping(sheffield, url, {
        kind: "pdf-text",
        text: "Not HTML",
        pages: 1,
        parserVersion: "test",
      }),
    ).toBeUndefined();
    const adapter = {
      id: "test",
      media: ["html" as const],
      supports: () => true,
      extract: () => undefined,
    };
    expect(() => createAdapterRegistry([adapter, adapter])).toThrow("DUPLICATE_ADAPTER");
    expect(
      resolveDetailMapping({ ...sheffield, dynamicDetail: "unknown" }, url, {
        kind: "html",
        text: sheffieldFixture("award"),
      }),
    ).toBeUndefined();
  });
});

it("canonicalises tracking and rejects path tricks before URL normalisation", () => {
  expect(canonicalDiscoveryUrl(url + "?utm_source=foo#top", url)).toBe(url);
  for (const raw of [
    url + "/%2e%2e/x",
    url + "/%2Fother",
    url + "\\x",
    "https://user:pass@sheffield.ac.uk/x",
    "http://sheffield.ac.uk/x",
  ])
    expect(() => canonicalDiscoveryUrl(raw, url)).toThrow();
  expect(() => allowedDiscoveryUrl(sheffield.url + "-evil/award", sheffield, "detail")).toThrow();
});

it("reads bounded JSON-LD evidence and ItemLists without fetching remote references", () => {
  const node = {
    "@type": "MonetaryGrant",
    name: "Reviewed award",
    url,
    educationalLevel: "Master",
    endDate: "2032-05-01",
  };
  const html = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [node, { "@type": "ItemList", itemListElement: [{ "@type": "ListItem", item: { url } }, { url: "http://unsafe.test" }] }] })}</script>`;
  expect(extractStructuredMetadata(html, url)).toEqual({
    opportunities: [
      { name: "Reviewed award", url, educationalLevel: "Master", endDate: "2032-05-01" },
    ],
    links: [url],
  });
  expect(() =>
    extractStructuredMetadata(html.replace(url, "https://evil.test/award"), url),
  ).toThrow("STRUCTURED_IDENTITY_CONFLICT");
  expect(() =>
    extractStructuredMetadata('<script type="application/ld+json">{</script>', url),
  ).toThrow("STRUCTURED_METADATA_INVALID");
  expect(() =>
    extractStructuredMetadata('<script type="application/ld+json">{}</script>'.repeat(21), url),
  ).toThrow("STRUCTURED_METADATA_LIMIT");
  expect(
    resolve(
      sheffieldFixture("award") +
        `<script type="application/ld+json">${JSON.stringify(node)}</script>`,
    ),
  ).toBeUndefined();
});
