# Architecture decisions

- **2026-10-24 — Domain boundaries:** server modules own accounts, profiles, scholarships, evidence, eligibility, applications, monitoring, notifications and operator administration. UI/actions delegate business rules to modules.
- **PostgreSQL everywhere:** use local PostgreSQL for verification and Neon-compatible PostgreSQL for hosting; no production mock or in-memory persistence fallback.
- **Transactional outbox:** accepted versions, audit history and pending events commit together. Durable database workers can run standalone; Inngest invokes bounded processing, never implying that execution moves off Vercel.
- **Evidence before certainty:** missing/conflicting evidence yields unknown. Publication is reviewed; source failure retains accepted data. No inferred cycle dates or GPA conversion.
- **Hosting:** implement the explicitly requested Next.js/Vercel stack in this repository. Sites-specific Vinext/Cloudflare deployment is not used because it conflicts with the requested stack.
- **External gates:** prepare runnable configurations and concise suites; never claim remotely configured protection without authentic account evidence.
- **Rule logic:** strong three-valued AND/OR semantics. Exemptions are explicit OR alternatives, so missing or failed unused alternatives cannot invalidate a satisfied group. Requirements with missing/conflicting source evidence cannot establish failure.
- **Evaluation freshness:** immutable records keyed by user, cycle, profile version, scholarship version and engine version. Reads require exact current versions. Workers recheck both versions under transaction locks before inserting; obsolete work is skipped rather than overwriting newer state.
- **Ranking:** explicit destination/field/institution/funding preference points, separate from eligibility and availability. No award-probability percentages or GPA conversion.
- **Current qualifications:** completed qualifications are recorded separately from current study; original grading scales and experience months/hours are retained without invented conversions.
