// Isolated invented award exercising the observed official template. Never seeded.
export const twenteFixture = (
  year = 2030,
) => `<main class="page-main"><h1>[TEST ONLY] ITC Example Scholarship</h1><div class="page-content">
<p>For the academic year ${year}/${year + 1}.</p><p>This fictional scholarship supports master's study at the University of Twente.</p>
<h2>Scholarship value</h2><ul><li>up to € 12,000</li></ul><p>This scholarship is meant as a compensation for study related costs.</p>
<div class="grantfinder__scholarship__programmes"><div class="title">Master's programmes</div><div class="programme__title">Computer Science</div></div>
<h2>Application deadline</h2><p>1 April ${year}</p>
<h2>Application requirements</h2><p>Applicants must confirm citizenship, academic admission and nomination conditions with the provider. Selection is not guaranteed.</p>
</div></main>`;
export const twenteTestUrl =
  "https://www.utwente.nl/en/education/scholarship-finder/itc-example-scholarship-programme/";
