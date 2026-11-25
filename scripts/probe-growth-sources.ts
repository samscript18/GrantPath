// Research only: explicit official endpoints, robots-aware bounded snapshots.
// This is not source authorisation and never touches a database.
import { mkdir, writeFile } from "node:fs/promises";
import { boundedFetchUrl, robotsPolicy } from "../src/server/monitoring/network";
const targets: Record<string, string> = {
  "ediss-current-call": "https://www.master-ediss.eu/upcoming-application-rounds-ediss-intake-7/",
  "csc-shared-call": "https://cscuk.fcdo.gov.uk/shared/",
  "csc-shared-canonical": "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships-applications/",
  "uq-lpdp-call": "https://scholarships.uq.edu.au/scholarship/uq-lpdp-cooperative-scholarship",
  "cambridge-mastercard-calls":
    "https://www.mastercardfoundation.fund.cam.ac.uk/apply/application-process-timeline",
  "euconexus-marine": "https://www.eu-conexus.eu/en/marine-biotechnology/",
  waves: "https://www.msc-waves.eu/",
  emildai: "https://emildai.eu/",
  egei: "https://www.master-egei.eu/",
  mer: "https://merconsortium.eu/",
  cybersure: "https://www.cybersure-master.eu/",
  "waves-funding": "https://www.msc-waves.eu/fees-and-funding",
  "emildai-apply": "https://emildai.eu/admissions/how-to-apply/",
  "egei-funding": "https://www.master-egei.eu/scholarships/",
  "cybersure-funding": "https://www.cybersure-master.eu/scholarships-and-fees",
  "ediss-programme": "https://www.master-ediss.eu/programme/",
  "usask-detail":
    "https://grad.usask.ca/funding/award-search.php?award=300491GS01&keyword=&department=&category=&type=Scholarship&deadline=",
  "usask-results": "https://grad.usask.ca/funding/award-search.php?type=Scholarship",
  usask: "https://grad.usask.ca/funding/award-search.php",
  calgary: "https://iac01.ucalgary.ca/FGSA/Public/PublicHome.aspx",
  "deai-funding": "https://deai.ulb.be/home/students/tuition-fees-scholarships/",
  "deai-apply": "https://deai.ulb.be/home/students/admission/",
  strains: "https://www.master-strains.eu/",
  cne: "https://master-cne.eu/",
  ediss: "https://www.master-ediss.eu/",
  remplus: "https://master-remplus2.eu/",
  sucat: "https://www.master-sucat.eu/",
  deai: "https://deai.ulb.be/",
  "ediss-funding": "https://www.master-ediss.eu/scholarship/",
  "ediss-apply": "https://www.master-ediss.eu/application-process/",
  "strains-funding": "https://master-strains.eu/erasmus-scholarship",
  alberta:
    "https://www.ualberta.ca/en/graduate-studies/fees-funding/scholarships-awards/department-awards/awards-links.html",
  ubc: "https://www.grad.ubc.ca/scholarships-awards-funding/award-opportunities?page=0",
  "ubc-detail": "https://www.grad.ubc.ca/awards/international-tuition-award",
  "ubc-doctoral": "https://www.grad.ubc.ca/awards/four-year-doctoral-fellowship-4yf",
  melbourne: "https://scholarships.unimelb.edu.au/",
  "educanada-study":
    "https://www.educanada.ca/scholarships-bourses/can/institutions/study-in-canada-sep-etudes-au-canada-pct.aspx?lang=eng",
  "educanada-elap":
    "https://www.educanada.ca/scholarships-bourses/can/institutions/elap-pfla.aspx?lang=eng",
  "leeds-central": "https://www.leeds.ac.uk/scholarships",
  "leeds-central-masters":
    "https://www.leeds.ac.uk/scholarship/4/masters-uk-excellence-scholarships-2027",
  "leeds-masters":
    "https://eps.leeds.ac.uk/directories/dir-record/scholarships/4739/uk-masters-excellence-scholarships",
  "leeds-water":
    "https://eps.leeds.ac.uk/directories/dir-record/scholarships/4709/water-sanitation-and-health-engineering-alumni-scholarship-international",
  leeds: "https://eps.leeds.ac.uk/directories/dir/scholarships",
  birmingham:
    "https://www.birmingham.ac.uk/study/postgraduate/scholarships-and-funding/search-funding",
  bristol: "https://www.bristol.ac.uk/international/fees-finance/scholarships/",
  manchester: "https://www.manchester.ac.uk/study/international/finance-and-scholarships/funding/",
  quanteem: "https://www.quanteem.eu/",
  microscom: "https://microscom.eu/",
  ssi: "https://ssi-master.eu/",
  emmir: "https://www.emmir.org/",
  geotech: "https://mastergeotech.info/",
  fipdes: "https://www.fipdes.eu/",
  lascala: "https://www.master-lascala.eu/",
  idoh: "https://www.infectious-diseases-one-health.eu/",
  "ssi-funding": "https://ssi-master.eu/fees-and-scholarships/",
  "geotech-funding": "https://mastergeotech.info/fees-fundings/erasmus-mundus-scholarships/",
  "emmir-apply": "https://www.emmir.org/applications",
  "emmir-funding": "https://www.emmir.org/cost-and-funding",
  awardexplorer: "https://awardexplorer.utoronto.ca/",
  "toronto-grad": "https://awardexplorer.utoronto.ca/grad",
  "toronto-undergrad": "https://awardexplorer.utoronto.ca/undergrad",
  grants: "https://grants.at/en/",
  "edinburgh-results":
    "https://registryservices.ed.ac.uk/student-funding/search-scholarships?field_loc_study_level_target_id=515&term_node_tid_depth=All&term_node_tid_depth_1=All",
  erasmus: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en",
  uq: "https://scholarships.uq.edu.au/scholarships",
  auckland: "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship.html",
  cambridge: "https://www.student-funding.cam.ac.uk/",
  monash: "https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship",
  sydney: "https://www.sydney.edu.au/scholarships/search.html",
  anu: "https://study.anu.edu.au/scholarships/find-scholarship",
  imperial: "https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/",
  ucl: "https://www.ucl.ac.uk/scholarships/scholarships-finder",
  oxford: "https://www.ox.ac.uk/students/fees-funding/search/graduate",
  kings: "https://www.kcl.ac.uk/study/funding",
  edinburgh: "https://registryservices.ed.ac.uk/student-funding/search-scholarships",
  warwick: "https://warwick.ac.uk/study/scholarships-and-bursaries/scholarships/",
  daad: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  japan:
    "https://www.studyinjapan.go.jp/en/search-for-scholarships/tuition-reduction_search.php?lang=en",
  educanada:
    "https://www.educanada.ca/scholarships-bourses/search-scholarships-rechercher-bourses.aspx?lang=eng",
  oead: "https://oead.at/en/study-research-teaching/overview-grants-and-scholarships",
  campusfrance: "https://www.canada.campusfrance.org/en/scholarship-programs",
  toronto: "https://www.registrar.utoronto.ca/financial-aid-awards/awards-scholarships/",
};
await mkdir(".local/growth", { recursive: true });
const selected = process.argv.slice(2);
if (!selected.length || selected.length > 6 || selected.some((id) => !targets[id]))
  throw new Error("Choose 1–6 explicit target IDs.");
async function probe(id: string) {
  const url = new URL(targets[id]);
  const report: Record<string, unknown> = {
    id,
    url: url.href,
    checkedAt: new Date().toISOString(),
  };
  try {
    const robots = await boundedFetchUrl(new URL("/robots.txt", url), true);
    report.robotsStatus = robots.status;
    await writeFile(`.local/growth/${id}-robots.txt`, robots.text);
    if (
      ![200, 404, 410].includes(robots.status) ||
      (robots.status === 200 && /<html|<!doctype/i.test(robots.text))
    )
      throw new Error("ROBOTS_UNAVAILABLE");
    const policy =
      robots.status === 200
        ? robotsPolicy(robots.text, url.pathname + url.search)
        : { allowed: true, crawlDelaySeconds: 20 };
    report.robots = policy;
    if (!policy.allowed) throw new Error("ROBOTS_DISALLOWED");
    if (policy.crawlDelaySeconds > 60) throw new Error("UNSUPPORTED_CRAWL_DELAY");
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(20, policy.crawlDelaySeconds) * 1000),
    );
    const page = await boundedFetchUrl(url);
    report.status = page.status;
    if (page.status !== 200) throw new Error(`SOURCE_HTTP:${page.status}`);
    await writeFile(`.local/growth/${id}-directory.html`, page.text);
    report.state = "retrieved";
    report.bytes = page.bytes.length;
  } catch (error) {
    report.state = "blocked";
    report.error = error instanceof Error ? error.message : "FAILED";
  }
  await writeFile(`.local/growth/${id}-probe.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
// Different approved hosts only; at most three in flight. No recursive traversal.
for (let offset = 0; offset < selected.length; offset += 3)
  await Promise.all(selected.slice(offset, offset + 3).map(probe));
