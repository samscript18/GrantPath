// Official sources inspected 24 October 2026. Reference guidance is not an eligibility conversion.
export const academicReferences = [
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
