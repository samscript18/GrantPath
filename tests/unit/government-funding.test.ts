import { expect, it } from "vitest";
import { directoryDefinitions } from "../../src/server/discovery/registry";
import { resolveDetailMapping } from "../../src/server/discovery/adapter-registry";
import { extractDetail } from "../../src/server/discovery/adapters";
import { publicationPolicy } from "../../src/server/discovery/policy";
import { evaluate } from "../../src/server/eligibility/engine";
import { emptyProfile } from "../../src/server/profiles/schema";
const url =
  "https://www.educanada.ca/scholarships-bourses/can/institutions/study-in-canada-sep-etudes-au-canada-pct.aspx?lang=eng";
const html = `<main><h1>Study in Canada Scholarships</h1><p>The application period is now closed.</p><h2>Notice to Canadian Institutions: Program Delivery Model Update - Effective 2034-2035 cycle</h2><p>Direct applications from individuals are not accepted.</p><h2>Objectives</h2><p>Global Affairs Canada supports international students through Canadian post-secondary institutions.</p><h2>Scholarship project scope and requirements</h2><p>Scholarships may only be awarded to citizens of the listed eligible countries enrolled full-time at an eligible institution. Canadian citizenship holders are excluded. Confirm the complete restrictions.</p><ul><li>$10,200 for 4 months at the college of undergraduate level</li><li>$10,200 for 4 months at the graduate level (Masters and PhD)</li><li>$14,000 for 5 to 6 months at the graduate level (Masters and PhD)</li></ul><h2>Application deadline</h2><p>Canadian institutions submit nominations; students do not apply directly.</p></main>`;
it("extracts an evidenced mobility cycle without representing it as direct full-degree funding", () => {
  const d = directoryDefinitions["educanada-government-feed"],
    m = resolveDetailMapping(d, url, { kind: "html", text: html })!;
  expect(m.cycle).toBe("2034/2035");
  expect(m.data.availability).toBe("closed");
  expect(m.data.fundingType).toBe("unknown");
  expect(m.data.deadline).toBeNull();
  expect(m.data.sourceFacts?.applicationRoute).toContain("cannot apply directly");
  expect(m.data.sourceFacts?.officialText1).toContain("Canadian citizenship holders are excluded");
  const x = extractDetail(m, html);
  expect(x.validation.codes).toEqual([]);
  expect(
    publicationPolicy({
      enabled: true,
      autoPublish: true,
      candidate: x.data,
      validation: x.validation,
    }).decision,
  ).toBe("auto_publish");
  expect(
    extractDetail(
      m,
      html.replace("citizens of the listed eligible countries", "citizens of Canada only"),
    ).validation.codes,
  ).toContain("UNSUPPORTED_SECTION_CHANGE");
});
it("holds unsupported layouts, contradictory cycle years and missing nomination evidence", () => {
  for (const text of [
    html.replace("2034-2035", "2034-2036"),
    html.replace("Direct applications from individuals are not accepted.", "Apply directly"),
    html.replace("Scholarship project scope and requirements", "General news"),
  ])
    expect(
      resolveDetailMapping(directoryDefinitions["educanada-government-feed"], url, {
        kind: "html",
        text,
      }),
    ).toBeUndefined();
});
it("uses only an explicit official country list for matching, preserving unknown remaining conditions", () => {
  const text = html.replace(
    "<ul>",
    "<ul><li>Citizens of the following eligible countries/territories:<ul><li><b>Sub-Saharan Africa:</b> Ghana, Nigeria;</li><li><b>Asia:</b> Nepal.</li></ul></li>",
  );
  const m = resolveDetailMapping(directoryDefinitions["educanada-government-feed"], url, {
    kind: "html",
    text,
  })!;
  expect(m.data.sourceFacts?.eligibleCitizenships).toContain("Nigeria");
  expect(
    evaluate(m.data.requirements, {
      ...emptyProfile(),
      targetLevel: "master",
      citizenships: ["Nigeria"],
    }).outcome,
  ).toBe("potential");
  expect(
    evaluate(m.data.requirements, {
      ...emptyProfile(),
      targetLevel: "master",
      citizenships: ["United States"],
    }).outcome,
  ).toBe("not_eligible");
  expect(extractDetail(m, text).validation.codes).toEqual([]);
});

it("extracts SEED-2's separate table layout, closed cycle and international restrictions", () => {
  const seedUrl =
    "https://www.educanada.ca/scholarships-bourses/can/institutions/seed-bpeed.aspx?lang=eng";
  const text = `<main><h1>Scholarships and Educational Exchanges for Development – Phase 2 (SEED-2)</h1><p>Application period for 2034-35 is closed.</p><p>Global Affairs Canada funds Canadian post-secondary institutions. Canadian institutions must apply on behalf of eligible candidates.</p><ul><li>✔ citizens of a country listed below:<ul><li><b>ASEAN Member States:</b> Brunei Darussalam, Myanmar, The Philippines;</li><li>Mongolia.</li></ul></li></ul><h2>Eligible expenses</h2><table><tr><td>College / undergraduate(4 months)</td><td>$10,200</td><td>Study at the college or undergraduate level.</td></tr><tr><td>Graduate(5-6 months)</td><td>$12,700</td><td>Study at the graduate level (Masters and PhD).</td></tr></table><h2>How funding works</h2><p>Tuition must be waived by Canadian institutions.</p><h2>Application instructions for Canadian institutions</h2><h2>Application deadline</h2></main>`;
  const m = resolveDetailMapping(directoryDefinitions["educanada-government-feed"], seedUrl, {
    kind: "html",
    text,
  })!;
  expect(m.cycle).toBe("2034/35");
  expect(m.data.availability).toBe("closed");
  expect(m.data.funding).toHaveLength(2);
  expect(m.data.sourceFacts?.eligibleCitizenships).toContain("Myanmar (Burma)");
  expect(extractDetail(m, text).validation.codes).toEqual([]);
  expect(
    evaluate(m.data.requirements, {
      ...emptyProfile(),
      targetLevel: "master",
      citizenships: ["Nigeria"],
    }).outcome,
  ).toBe("not_eligible");
  expect(
    evaluate(m.data.requirements, {
      ...emptyProfile(),
      targetLevel: "master",
      citizenships: ["Mongolia"],
    }).outcome,
  ).toBe("potential");
  expect(
    resolveDetailMapping(directoryDefinitions["educanada-government-feed"], seedUrl, {
      kind: "html",
      text: text.replace("2034-35", "2034-37"),
    }),
  ).toBeUndefined();
});
