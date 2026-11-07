# Requirement × profile × expected outcome

Engine version: 1.3.0 (country/institution preference ranking refresh; rule grammar unchanged). Deterministic conditions are independent of Next.js, matching persistence and preference ranking. `tests/unit/eligibility.test.ts` asserts these cases and exact reason codes are exposed in per-rule explanations. Phase 7 adds the independently authored reference comparison.

| Requirement                                    | Profile state                                       | Rule result / reason                                      |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Accepted citizenship                           | Citizenship omitted, residence supplied             | unknown / PROFILE_MISSING                                 |
| Accepted citizenship                           | One of multiple citizenships accepted               | pass / VALUE_ACCEPTED                                     |
| Excluded citizenship                           | Any held citizenship excluded                       | fail / VALUE_NOT_ACCEPTED (unless an OR exemption passes) |
| Residence                                      | Citizenship matches, residence omitted              | unknown / PROFILE_MISSING                                 |
| Any mandatory requirement                      | Source unverified                                   | unknown / SOURCE_UNVERIFIED                               |
| AND                                            | fail + unknown                                      | fail / ALL_FAIL                                           |
| OR                                             | fail + unknown                                      | unknown / ANY_UNKNOWN                                     |
| OR                                             | pass + unknown or fail                              | pass / ANY_PASS                                           |
| Language test OR English-medium exemption      | Missing test; confirmed exemption                   | pass / ANY_PASS                                           |
| Language test OR exemption                     | Low score; exemption unknown                        | unknown / ANY_UNKNOWN                                     |
| Qualification                                  | Recorded completed accepted degree                  | pass / QUALIFICATION_HELD                                 |
| Provider permits final-year completion by date | Expected graduation on or before boundary           | pass / FINAL_YEAR_COMPLETION_BY_DATE                      |
| Same final-year rule                           | Expected graduation after boundary                  | fail / COMPLETION_TOO_LATE                                |
| Same final-year rule                           | Graduation date missing                             | unknown / COMPLETION_DATE_MISSING                         |
| Degree exclusion                               | Current unfinished degree, held degrees unconfirmed | unknown / QUALIFICATION_HOLDING_UNCONFIRMED               |
| GPA minimum on scale 4                         | Original scale 5, no stated equivalence             | unknown / GPA_SCALE_UNSUPPORTED                           |
| GPA equivalence explicitly stated by provider  | Original score meets supported threshold            | pass / GPA_MEETS_THRESHOLD                                |
| Work hours minimum                             | Months known; hours unknown                         | unknown / PROFILE_MISSING                                 |
| Work hours minimum                             | Explicit zero below threshold                       | fail / THRESHOLD_NOT_MET                                  |
| Language validity                              | Expiry exactly on provider reference date           | pass / LANGUAGE_MEETS_THRESHOLD                           |
| Language validity                              | Expires before provider reference date              | fail / LANGUAGE_EXPIRED                                   |
| Age limit                                      | Birthday crosses threshold on reference date        | exact completed-year comparison                           |
| Inclusive date condition                       | Date equals boundary                                | pass / DATE_CONDITION_MET                                 |
| Ranking                                        | Known mandatory failure, all preferences match      | excluded; zero ranking score                              |
| Unmapped provider condition                    | Any profile                                         | unknown / SOURCE_UNVERIFIED or PROVIDER_CONFIRMATION      |

An overall pass means eligible based on available information, not an award prediction. An overall unknown is a potential match. A verified mandatory failure establishes ineligibility. Official application availability remains separate. Past or pending evaluations are explicitly historical; current reads require exact profile, scholarship and engine versions. No asynchronous job overwrites an evaluation: the records are immutable and uniquely keyed by all input versions.

## Global/discovery additions

| Requirement or context                 | Profile / publication state                                     | Expected result                                                          |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Multi-destination preference           | Preferred Germany, joint GB+DE programme                        | Preference points using DE identity; one opportunity                     |
| Provider country                       | Sponsor in US, actual study in Ghana                            | Ghana destination match only; no US destination inferred                 |
| Unconfirmed/global location            | Preferred country supplied but provider gives no actual country | No fabricated location preference points; eligibility unchanged          |
| Unmapped mandatory provider conditions | Other supported requirements pass                               | Potential, provider confirmation remains unknown                         |
| Accepted controlled level change       | Target master; accepted source now bachelor                     | Not eligible, exact VALUE_NOT_ACCEPTED, newer scholarship/engine context |
| Unknown alternative                    | One OR branch fails and another is unknown                      | Potential; existing independent reference agreement retained             |
| Historical/open availability           | Same complete profile and conditions                            | Eligibility assessed separately; availability remains source-defined     |

No automatic GPA conversion was introduced. Original scales and explicit provider equivalences remain the only supported comparisons. Bounded generated/reference checks do not prove all real-world scholarship interpretations.
