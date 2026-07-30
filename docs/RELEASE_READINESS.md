# FlowDine release readiness

## Current verdict

**BRANCH READY** for review as a single-restaurant pilot; not ready for
independent restaurant onboarding.

The implemented single-restaurant pilot slice passes its automated and live
authentication gates. General restaurant SaaS onboarding remains blocked by
tenant-scoped operational persistence and self-service restaurant provisioning.

## Gate status

| Gate | Status | Notes |
|---|---|---|
| Application startup | Pass | Next QA runtime and Vinext production build pass |
| Public guest demo | Pass | Menu and cart stay public; checkout requires Google or verified email |
| Customer order ownership | Pass locally | Orders bind to the verified Supabase user ID; private history, tracking, cross-device sync, and cross-account denial pass |
| Email authentication | Pass | Confirmation required and a confirmed production account record verified |
| Google OAuth | Pass | External app published; Supabase provider and real production callback verified |
| Staff authorization | Pass locally | Role matrix, owner invitation RPC, active-membership filter, stage ownership, and protected workspaces implemented |
| Billing authorization | Pass for simulated billing | Manager/owner only, served lifecycle and duplicate denial verified |
| Queue ownership | Pass | Private receipt, public redaction and refresh persistence verified |
| Inventory integrity | Pass implemented slice | Reservation, cancellation and final-portion concurrency assertions pass |
| Operational persistence | Pass locally | Normalized D1 tables, legacy import, atomic guarded batches, entity audit timeline |
| Multi-tenant isolation | Out of scope | Branch intentionally targets one Saffron Circuit deployment |
| Clean migrations and seed | Pass locally | All D1 migrations apply to disposable SQLite; Supabase staff migration is already applied |
| Automated browser coverage | Pass | 40/40 desktop/mobile cases; screenshot and trace artifacts configured |
| Accessibility | Pass automated | Zero serious/critical Axe violations on four public routes |
| Dependency security | Pass | No known production vulnerabilities |
| Lint/typecheck/unit/build | Pass | 0 lint errors, 24/24 unit, typecheck, and Vinext build pass |

## Release boundary

This branch targets a controlled Saffron Circuit pilot with manually recorded
payments. It must not be represented as a general restaurant SaaS. Before each
promotion, apply the pending D1 migration and repeat production authentication,
checkout, ownership, and tracking smoke checks.

## Deployment provenance

Production releases are built and tested locally, packaged with the Sites
hosting manifest, and saved against the exact pushed Git commit before
deployment. This keeps the public demo traceable to the same source revision
that passed the release gates above.
