# Interface review — 24 November 2026

The design pass preserves GrantPath's forest green, warm off-white, amber accents and type families. Changes are local; no push, deployment, production-role change or paid TestSprite execution is claimed.

## Changes

- Operator Studio has six focused work areas, active navigation, a searchable catalogue, publication filters, proper edit buttons, source-policy switches, compact disclosures and a redesigned queue panel. Source onboarding, evidence review, publication history, provider images, jobs and audit controls remain available.
- Section selection is kept in the URL through Next.js's supported native-history integration. Switching sections does not reload the document. Deep links open the appropriate section/disclosure; modified clicks retain normal link behaviour.
- Page titles, introductions, FAQs and study-profile guidance use clearer, shorter wording. Settings cards have one useful description rather than repeated explanations. Mobile settings expose all sections in a grid.
- Shared headers are more compact, scholarship summaries are easier to scan, and standalone actions look like buttons. Empty states offer a direct next step. Mobile authentication forms start higher on the page.
- Shared styles use existing dark-mode tokens and retain keyboard focus and reduced-motion support. Long tables scroll inside their containers. Source links, accepted information, uncertainty labels, eligibility rules and private data permissions are preserved.

## Verification

The final working-tree production build passed, including Next.js TypeScript checks. Targeted ESLint for all app/components and the settings assertion passed; formatting and whitespace checks passed. The settings heading assertion was updated for the clearer label, with its existing behaviour checks retained.

Actual local browser review covered the landing page, catalogue, scholarship detail, five authentication/recovery pages, dashboard, saved scholarships, applications, inbox, profile, references, six settings routes and Operator Studio. Screenshots were inspected at desktop and 360px; the checked pages had no horizontal page overflow. Private-page and final public-page journeys reported no browser runtime errors. These are UI checks, not exhaustive checks of every data-dependent state or email/provider operation.

A focused Operator Studio journey passed all six section switches with zero document reloads, correct active selection, keyboard navigation, catalogue filtering and empty-state recovery, exception-link reload, policy-switch form values without submission, dark mode and all six sections at 360px. A previous snapshot failed the zero-reload assertion with six document navigations; the native-history fix passed the unchanged assertion. Diagnostic continuation was not counted as a passing run.

Verification used existing isolated fixture databases and sink email. No production reset, source fetch, account-role mutation, recipient-email claim or paid inference was required. Early copied-checkout previews had slow compilation/timeouts; final verification used the successful build in the real checkout. A full Vitest/PostgreSQL suite or new TestSprite run was not required or claimed for this presentation pass.

Receipts: [public pages](evidence/ui-design-public.json), [private pages](evidence/ui-design-private.json), [Operator Studio](evidence/ui-design-operator.json). Screenshots and execution logs are in ignored `.local/design-*` and `.local/operator-studio-*` files. Unrelated working-tree discovery, documentation and package changes were preserved.

## Motion and expanded landing page

Added a decorative ambition atlas in the hero: orbiting rings, floating feature tickets, a rising sun, an animated path, staged headline entrance and pointer-responsive depth. The graphic describes product features, not fabricated scholarship or student outcomes. Three new sections explain match outcomes, application planning and official-source evidence, with functioning destination links.

Shared motion progressively reveals sections, scholarship rows and workspace cards, with hover details on buttons and navigation. No content depends on an animation to become readable. A persistent motion control pauses decorative loops and cancels reveal effects; device reduced-motion settings override the toggle. Pausing during headline entrance leaves its full text visible. All motion uses CSS and native browser APIs; no dependency or paid service was added.

Local browser checks passed: pause/re-enable and reload persistence, 360px document overflow, reduced-motion activation and restoration, new sections present and no runtime errors. Desktop/mobile hero and new-section screenshots were inspected. Type checking, scoped lint, formatting, whitespace checks and production build passed. The initial typecheck encountered an unrelated in-progress Erasmus data-mapping type error; the subsequent current-tree check passed without changing that data module in this motion increment. [Motion receipt](evidence/ui-motion.json). No push, deployment or TestSprite execution is claimed.
