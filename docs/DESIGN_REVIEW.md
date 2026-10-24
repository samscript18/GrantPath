# GrantPath visual redesign — 24 October 2026

The user asked for a redesign across all pages while retaining the current brand colors and fonts. The existing semantic palette and type families are preserved. Testing and GitHub publication remain paused at the user's request.

## Design direction

- Warm editorial surfaces, clearer page hierarchy, fewer competing boxes, and more readable body text.
- Original decorative SVG artwork based on the GrantPath path/sprout identity. The illustration represents no person, institution, scholarship data or outcome.
- Consistent input, button, badge, disclosure and empty-state treatment across account, student and operator screens.
- Persistent workspace navigation, distinct content layouts, visible keyboard focus, native controls and reduced-motion support.

## Page coverage

| Pages                       | Implemented design changes                                                                                                          | Rendered visual review                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Landing                     | New hero/artwork, real featured opportunities, process section, closing action and footer                                           | Desktop and 360px screenshots inspected; compact mobile hero refinement captured               |
| Login/register              | Framed two-column layout, illustrated forest panel, focused form hierarchy and compact mobile header; password checklist refinement | Login desktop; registration 360px light/dark screenshots inspected                             |
| Verification/recovery/reset | Updated shared account layout, inputs, buttons and guidance                                                                         | Shared layout reviewed; individual recovery/verification states not separately inspected       |
| Dashboard                   | More focused hero, brand artwork, data-backed summary rail, opportunity rows and deadline panel                                     | Signed-in visual review pending                                                                |
| Catalogue                   | Contained search/filter toolbar, redesigned scholarship rows, clear funding/timing/availability hierarchy                           | Desktop and 360px screenshots inspected; final mobile summary/arrow refinements not recaptured |
| Scholarship details         | Framed header, section navigation, funding panel, requirement states, evidence panels, accepted-change timeline and timing sidebar  | Desktop and 360px light/dark screenshots inspected; mobile grid overflow corrected             |
| Saved                       | Individual shortlist sections, separated personal actions and contextual guide                                                      | Signed-in visual review pending                                                                |
| Applications                | Horizontal application board, list switcher, real checklist progress and clearer editing disclosures                                | Signed-in visual review pending                                                                |
| Inbox                       | Segmented filters, unread treatment, topic icons and clearer message hierarchy                                                      | Signed-in visual review pending                                                                |
| Profile/onboarding          | Contextual guidance for each stage, academic-record grouping, clearer form controls and navigation                                  | Signed-in visual review pending                                                                |
| Settings                    | Coordinated directory, notification controls, mobile appearance previews, account details and app reference rows                    | Signed-in visual review pending                                                                |
| Academic references         | Editorial source directory, search, real reference count and original-result guidance                                               | Desktop screenshot captured                                                                    |
| Operator                    | Data-backed summary, section navigation, catalogue table spacing, review panels and structured editors                              | Operator visual review pending                                                                 |
| Loading/error/not found     | Branded loading indicator and coordinated root/workspace recovery layouts                                                           | Root not-found 360px screenshot captured; other fallback states not forced                     |

Screenshots are in ignored `.local/design-review/`. Browser work only captured layouts; it did not run an automated assertion suite. The existing isolated student login was unavailable locally, so private-page screenshots were not obtained. No new account, auth bypass, fictional production record or database mutation was added to obtain them.

No production build, typecheck, lint, Vitest, Playwright test suite, TestSprite execution or GitHub push was run for this redesign. Existing unrelated test changes predate the user's pause. Public screenshot rendering is not evidence that every interaction or authenticated state works.

## Subsequent profile overview

The new `/profile` overview adds real account identity/details, saved study foundations, name editing and profile-photo controls, with Profile visible in both navigation layouts. The staged study editor remains at `/settings/profile`. The reference image's rank/XP and other unsupported fields were not copied. Photo persistence/processing and identity edits are functional implementations, not mock buttons, but have not been run against an authenticated account or visually reviewed while the testing pause remains in force. Browser/TestSprite journeys that previously expected a form directly at `/profile` must be adapted to the new study-editor entry point before future release verification.

## Useful settings and account controls

Replaced static time-zone guidance with a searchable inline editor and an actual date/time preview. Academic References now stands on its own in the main navigation. Removed the empty accessibility section. Added reference-inspired, theme-aware split panels for password confirmation, actual session cards, account export and deletion/cancellation. Forms include independent password visibility, the shared live checklist, six-digit code entry/countdown, provider-status language, inline confirmation and recovery feedback. The server-driven cancellation deadline and periodic session-refresh timestamp are labelled accurately. Private password/session/privacy page visual review remains pending; no synthetic signed-in data was substituted.

Captured and inspected the actual updated Academic References page at desktop/360px, including its dedicated active main-navigation item, and the mobile login confirmation layout reached with its presentation query parameter. This last screenshot is a layout review, not evidence that a password was changed. Artifacts are ignored under `.local/design-review/`. The in-app browser control tool was unavailable; the repository browser dependency captured these screenshots without running its test runner or invoking account mutations. The first browser launch was sandbox-blocked; the permitted screenshot-only rerun succeeded.

## Provider identity and compact actions

Added real institutional imagery with graceful initials where a source is unavailable. Provider identity is consistent across landing examples, catalogue, details, dashboard, saved opportunities and application cards. Operator image controls use contained previews and explicit source attribution. Save actions now use familiar outlined/filled bookmark icons with accessible labels and quiet loading/feedback. Refined common headings/separators, reading scale, surface borders, navigation hover, form focus and application/operator rows. Colors and type families are unchanged.

Actual desktop/360px landing, catalogue and scholarship detail screenshots were captured and inspected after six Cloudinary imports. Original artifacts are ignored under `.local/design-review/provider-*`. Private view rendering and functional journeys remain pending. Session rows now use a two-column grid on medium/wider screens; the study-profile modal uses a constrained scrollable surface, native focus management, responsive steps, explicit save-progress wording and reduced-motion support. Those private compositions are implemented but not visually verified here.
