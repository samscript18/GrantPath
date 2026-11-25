// Reference guidance is not an eligibility conversion. Preserve each review date.
const originalReferences = [
  {
    provider: "University of Oxford",
    region: "International",
    type: "Provider equivalences",
    url: "https://www.ox.ac.uk/admissions/graduate/international-applicants/international-qualifications",
    summary:
      "Country-specific postgraduate entry guidance, including Nigeria, Ghana, India and many other systems. Course and institutional conditions can differ.",
  },
  {
    provider: "University of Cambridge",
    region: "International",
    type: "Provider equivalences",
    url: "https://www.postgraduate.study.cam.ac.uk/apply/before/international-qualifications",
    summary:
      "Published country and qualification tables distinguish degree level, institution and required UK class. Use the exact course's conditions.",
  },
  {
    provider: "University of British Columbia Okanagan",
    region: "Canada",
    type: "Percentage / GPA guidance",
    url: "https://students.ok.ubc.ca/academic-success/grades-performance/",
    summary:
      "Describes percentage grading and explains that a receiving institution's own scale governs GPA equivalents. A displayed comparison is not universal.",
  },
  {
    provider: "McGill University",
    region: "Canada",
    type: "Original 4-point scale",
    url: "https://coursecatalogue.mcgill.ca/en/regulations/undergraduate/student-records/grading-gpa/grading-gpa.pdf",
    summary:
      "Official letter grades, grade points and weighted GPA calculation, with faculty-specific exceptions. Consult the transcript and applicable faculty rules.",
  },
  {
    provider: "University of Queensland",
    region: "Australia",
    type: "Original 7-point scale",
    url: "https://my.uq.edu.au/information-and-services/manage-my-program/exams-and-assessment/final-grades",
    summary:
      "Explains a seven-point grading system and grade descriptors. This is UQ's grading system, not a proportional conversion from another university.",
  },
  {
    provider: "University of Melbourne",
    region: "Australia",
    type: "Grading scheme history",
    url: "https://students.unimelb.edu.au/course-admin/results/previous-grading-schemes",
    summary:
      "Dated current and historical scheme references show why the year and qualification matter. Follow the linked current results guidance for recent study.",
  },
  {
    provider: "University of Auckland",
    region: "New Zealand",
    type: "Original scale and GPA calculation",
    url: "https://uoa.custhelp.com/app/answers/detail/a_id/2454/~/calculating-your-grade-point-average",
    summary:
      "Explains its nine-point calculation, credit weighting and exclusions. Faculty and programme purposes can affect calculation; use official assessment for admissions.",
  },
  {
    provider: "University of Passau",
    region: "Germany",
    type: "Modified Bavarian formula",
    url: "https://www.uni-passau.de/en/apply/apply-with-intl-qualifications/international-grade-converter",
    summary:
      "Official orientation tool needs the best achievable grade, minimum passing grade and original result. The university states the estimate is non-binding.",
  },
  {
    provider: "University of Bayreuth",
    region: "Germany",
    type: "Modified Bavarian formula",
    url: "https://www.studierendenkanzlei.uni-bayreuth.de/en/prospective-students/international-applicants/grade-conversion-Bavarian-Formula/",
    summary:
      "Published conversion tool requires original grading boundaries. It provides orientation, with the institution retaining the final assessment.",
  },
  {
    provider: "Catholic University of Eichstätt-Ingolstadt",
    region: "Germany",
    type: "Conversion conditions",
    url: "https://www.ku.de/en/study-at-the-ku/recognition-and-credit-transfer/credit-transfer-process-request-form-consequences-teacher-training-internships-student-grant-bafoeg/grade-conversion-according-to-the-bavarian-formula",
    summary:
      "Explains exceptions, degree regulations and locally adjusted maxima. Formula inputs and rounding cannot safely be assumed across providers.",
  },
] as const;

export const academicReferences = [
  ...originalReferences.map((row) => ({ ...row, reviewedAt: "2026-10-24" })),

  {
    provider: "National Universities Commission — Nigerian University System",
    region: "Nigeria",
    type: "Institution and programme recognition",
    url: "https://enuc.nuc.edu.ng/nus",
    summary:
      "Check recognised Nigerian universities and approved programmes in the regulator’s directory. Institutional recognition does not establish a scholarship GPA equivalence.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "South African Qualifications Authority",
    region: "South Africa",
    type: "Foreign qualification evaluation",
    url: "https://saqa.org.za/services/evaluation-of-foreign-qualifications/",
    summary:
      "Explains document verification and comparison with the South African qualifications framework. Admission and professional licensing require separate decisions by the relevant institution or authority.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "University of Cape Town",
    region: "South Africa",
    type: "Percentage grades and transcript guidance",
    url: "https://uct.ac.za/studyabroad/academic-life/exams-uct",
    summary:
      "Study-abroad guidance explains percentage marks and degree classifications. A transcript conversion recommendation is guidance for the receiving university, which determines its own equivalence.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "University of Ghana — School of Graduate Studies",
    region: "Ghana",
    type: "Master’s grading regulations",
    url: "https://sgs.ug.edu.gh/sites/sgs.ug.edu.gh/files/2026-05/UG%20Masters%20Regulations_July%202025_final%20edit.pdf",
    summary:
      "The July 2025 master’s regulations cover coursework grading and graduation requirements. Use the regulations applicable to your programme and cohort; doctoral and undergraduate requirements may differ.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Commission for University Education",
    region: "Kenya",
    type: "Recognition and equation of qualifications",
    url: "https://www.cue.or.ke/index.php?Itemid=474&id=10&option=com_content&view=article",
    summary:
      "Explains recognition of foreign university awards, accreditation checks and certified documentation. Read the requirements for the exact qualification level rather than assuming a general grade conversion.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "National Council for Higher Education",
    region: "Uganda",
    type: "Recognition and equation procedure",
    url: "https://unche.or.ug/recognition-and-equation/",
    summary:
      "Lists documents for local recognition and foreign qualification equation, including transcripts and translations where applicable. Qualification recognition is distinct from scholarship eligibility.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Tanzania Commission for Universities",
    region: "Tanzania",
    type: "Foreign qualification recognition",
    url: "https://tcu.go.tz/services/recognition-foreign-qualifications",
    summary:
      "Explains the Foreign Award Assessment System and recognition for further study. Institutions may submit requests for foreign applicants during admission; professional registration is a separate process.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Higher Education Council",
    region: "Rwanda",
    type: "Academic qualification equivalence",
    url: "https://www.hec.gov.rw/apply-for-equivalence/recognition-of-academic-qualifications",
    summary:
      "Describes equivalence certificates for higher education completed abroad, supporting documents and translation requirements. Consult the current procedure and qualification-specific checklist before applying.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Zambia Qualifications Authority",
    region: "Zambia",
    type: "Verification and evaluation",
    url: "https://www.zaqa.gov.zm/learners/",
    summary:
      "Distinguishes checking the authenticity of an award from comparing a foreign qualification with Zambia’s qualifications framework. Includes guidance for holders, institutions and employers.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "University of Toronto",
    region: "Canada",
    type: "Transcript grading scales and notations",
    url: "https://www.registrar.utoronto.ca/records-academics/transcripts/grading-scales-notations/",
    summary:
      "Explains transcript grading scales, GPA notations and historical exceptions. Match the faculty, programme and period on the original transcript instead of applying a universal scale.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "University of British Columbia — Vancouver",
    region: "Canada",
    type: "Course grades and academic calendar",
    url: "https://students.ubc.ca/enrolment/courses/grades/",
    summary:
      "Provides letter and percentage grade guidance and links to the Academic Calendar for complete grading practices. Receiving institutions determine how these original results are assessed.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "University of Sydney",
    region: "Australia",
    type: "Weighted Average Mark",
    url: "https://www.sydney.edu.au/students/results/weighted-average-mark/how-to-find-my-wam.html",
    summary:
      "Explains credit-weighted average marks and faculty exceptions. Sydney does not use GPA; applicants asked for one should follow the requesting institution’s calculation requirements.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Australian National University",
    region: "Australia",
    type: "GPA calculation",
    url: "https://www.anu.edu.au/students/program-administration/assessments-exams/grade-point-average-gpa",
    summary:
      "Explains ANU’s GPA calculation and the relationship to its grading scale. Apply the university’s inclusions and exclusions rather than proportionally rescaling results from another institution.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "New Zealand Qualifications Authority",
    region: "New Zealand",
    type: "International Qualification Assessment",
    url: "https://www2.nzqa.govt.nz/international/recognise-overseas-qual/iqa/",
    summary:
      "Explains when overseas qualifications can be assessed against New Zealand qualification levels and types. An assessment from another country is not automatically an NZQA assessment.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "National University of Singapore",
    region: "Singapore",
    type: "Academic structure and grading",
    url: "https://www.nus.edu.sg/registrar/academic-information-policies/academic-structure-grading",
    summary:
      "Official undergraduate grading and GPA guidance, including academic structure and grading options. Check the separate graduate policies when applying with postgraduate results.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Hong Kong University of Science and Technology",
    region: "Hong Kong",
    type: "Transcript grades and historical scales",
    url: "https://registry.hkust.edu.hk/transcript-grading",
    summary:
      "Explains transcript symbols, grade averages and the change from the earlier twelve-point system. Programme type and study period matter when interpreting an original transcript.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "UK ENIC",
    region: "United Kingdom",
    type: "Qualification comparability",
    url: "https://www.enic.org.uk/individuals/statement-of-comparability",
    summary:
      "Explains which international qualifications a Statement of Comparability can assess. The statement supports original documents and does not replace an admitting institution’s decision or English-language evidence.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Nuffic",
    region: "Netherlands",
    type: "Credential evaluation",
    url: "https://www.nuffic.nl/en/study-and-work-in-the-netherlands/applying-for-a-credential-evaluation",
    summary:
      "Describes evaluation of foreign diplomas against Dutch education levels. Use the receiving institution’s admission requirements alongside the qualification comparison.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Swedish Council for Higher Education",
    region: "Sweden",
    type: "Recognition of foreign qualifications",
    url: "https://uhr.se/en/start/recognition-of-foreign-qualifications/",
    summary:
      "Official entry point for foreign qualification recognition and the qualifications assessment tool. Individual recognition, admission and regulated-profession requirements serve different purposes.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Finnish National Agency for Education",
    region: "Finland",
    type: "Recognition and further study",
    url: "https://www.oph.fi/en/services/recognition-and-international-comparability-qualifications/recognition-foreign",
    summary:
      "Explains when formal recognition is required. For further study, the receiving education institution assesses admission rights and decides whether prior learning can be credited.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Norwegian Directorate for Higher Education and Skills",
    region: "Norway",
    type: "Foreign education recognition",
    url: "https://hkdir.no/en/foreign-education/our-recognition-schemes",
    summary:
      "Lists recognition schemes for qualifications completed outside Norway. Choose the scheme that matches the award; general recognition and admission requirements should be checked separately.",
    reviewedAt: "2026-11-24",
  },
  {
    provider: "Service Public — foreign diplomas in France",
    region: "France",
    type: "Diploma comparability and admission",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F463",
    summary:
      "Government guidance distinguishes diploma comparability from recognition during European mobility. It links to ENIC-NARIC procedures and explains that the route depends on the purpose of recognition.",
    reviewedAt: "2026-11-24",
  },
] as const;
