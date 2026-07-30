# FlowDine release readiness

## Current verdict

**BRANCH READY** for review as a single-restaurant pilot; not ready for
independent restaurant onboarding.

The implemented single-restaurant pilot slice passes its automated and live
authentication gates. General restaurant SaaS onboarding remains blocked by
tenant-scoped operational persistence and customer-owned records.

## Gate status

| Gate | Status | Notes |
|---|---|---|
| Application startup | Pass | Next QA runtime and Vinext production build pass |
| Public guest demo | Pass | Menu, cart persistence, ordering, reservation, queue and responsive smoke pass |
| Email authentication | Pass | Confirmation required and a confirmed production account record verified |
| Google OAuth | Pass | External app published; Supabase provider and real production callback verified |
| Staff authorization | Pass locally | Role matrix, owner invitation RPC, active-membership filter, stage ownership, and protected workspaces implemented |
| Billing authorization | Pass for simulated billing | Manager/owner only, served lifecycle and duplicate denial verified |
| Queue ownership | Pass | Private receipt, public redaction and refresh persistence verified |
| Inventory integrity | Pass implemented slice | Reservation, cancellation and final-portion concurrency assertions pass |
| Operational persistence | Pass locally | Normalized D1 tables, legacy import, atomic guarded batches, entity audit timeline |
| Multi-tenant isolation | Out of scope | Branch intentionally targets one Saffron Circuit deployment |
| Clean migrations and seed | Pass locally | D1 migration applies to disposable SQLite; Supabase staff migration requires remote apply |
| Automated browser coverage | Pass | 36/36 desktop/mobile cases; screenshot and trace artifacts configured |
| Accessibility | Pass automated | Zero serious/critical Axe violations on four public routes |
| Dependency security | Pass | No known production vulnerabilities |
| Lint/typecheck/unit/build | Pass | 0 lint errors, 24/24 unit, typecheck, and Vinext build pass |

## Release boundary

This branch targets a controlled Saffron Circuit pilot with manually recorded
payments and no sensitive customer data. It must not be represented as a
general restaurant SaaS. Before a real pilot, apply both new migrations, verify
an invited staff signup against production Supabase, and promote the branch
only after production smoke checks.

## Deployment provenance

Production releases are built and tested locally, packaged with the Sites
hosting manifest, and saved against the exact pushed Git commit before
deployment. This keeps the public demo traceable to the same source revision
that passed the release gates above.
