// Controlled template contracts. These are not live-source results.
export function sheffieldFixture(tag: string, year = 2032) {
  return `<html><main><h1 class="page-title">[TEST ONLY] ${tag} Masters Scholarships</h1><article>
  <p>The University of Sheffield offers masters scholarships for international students who hold an eligible course offer.</p>
  <p>Applicants must study in the ${year}-${String(year + 1).slice(-2)} academic year.</p>
  <h2>Eligibility</h2><p>Applicants must confirm citizenship, residence, language, academic qualifications and their admission offer.</p>
  <h2>How to apply</h2><p>Invited students must apply through the official university guidance. Closing dates require confirmation.</p>
  <h2>Terms and conditions</h2><p>The tuition fee award is subject to selection; maintenance and travel funding are not established.</p>
  </article></main></html>`;
}
export function cscFixture(year = 2032) {
  return `<article class="type-cscukscholarship"><h1 class="entry-title">[TEST ONLY] Commonwealth PhD Scholarships</h1><div class="entry-content">
  <p>Commonwealth PhD Scholarships support full-time doctoral study at a UK university for eligible international applicants.</p>
  <h1>How to apply</h1><p>Applications for the ${year}/${String(year + 1).slice(-2)} academic year require nomination.</p>
  <h1>Applicant eligibility</h1><p>A Master's degree may be required as a prior qualification; it is not the funded study level.</p>
  <h1>Financial assistance</h1><p>Confirm the tuition, stipend, travel and other funding terms with the official provider.</p>
  </div></article>`;
}
