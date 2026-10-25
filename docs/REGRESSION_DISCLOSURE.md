# Genuine saved-country defect verification

The persisted residence selector previously called React Hook Form with undefined when its selected chip was removed. RHF restored its default value. This was discovered in actual local production-browser review (settings.spec.ts), not invented as an organic remote incident.

The corrected control passes an empty string, while profile validation interprets that as unknown. A strengthened existing TestSprite profile case first saves/reloads Ghana, removes it, asserts no chip and an empty input, then reselects/saves Ghana and retains the earlier profile/application assertions.

For the isolated release verification head only, the original two undefined-change lines will be explicitly reintroduced after the healthy implementation commit long enough to obtain the requested authentic App failure and required-gate readback. The fully implemented correction is already prepared and locally verified in the subsequent fix. No country filter, access control, accepted scholarship history, user data or production main branch will be deliberately corrupted. Do not merge the verification head.
