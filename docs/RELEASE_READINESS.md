# FlowDine release readiness

## Current verdict

**NOT READY** for onboarding independent restaurants.

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
| Staff authorization | Pass | Role matrix, stage ownership, live owner membership, and all protected workspaces verified |
| Billing authorization | Pass for simulated billing | Manager/owner only, served lifecycle and duplicate denial verified |
| Queue ownership | Pass | Private receipt, public redaction and refresh persistence verified |
| Inventory integrity | Pass implemented slice | Reservation, cancellation and final-portion concurrency assertions pass |
| Multi-tenant isolation | Failed for runtime | D1 state is single-restaurant; normalized schema is not wired |
| Clean migrations and seed | Partial | Seed added, remote migration parity and lint pass; disposable reset blocked by missing Docker |
| Automated browser coverage | Pass | 28/28 desktop/mobile cases; screenshot and trace artifacts configured |
| Accessibility | Pass automated | Zero serious/critical Axe violations on four public routes |
| Dependency security | Pass | No known production vulnerabilities |
| Lint/typecheck/unit/build | Pass | 0 lint errors, 18/18 unit, typecheck and Vinext build pass |

## Release boundary

The public URL may be used as a controlled, fictional Saffron Circuit
hackathon demonstration with no real payments or sensitive customer data. It
must not be represented as a general restaurant SaaS until operational state is
migrated to tenant-scoped PostgreSQL transactions, customer records have
identity/session ownership, and real payment/notification providers are
integrated and verified.

## Deployment provenance

Production releases are built and tested locally, packaged with the Sites
hosting manifest, and saved against the exact pushed Git commit before
deployment. This keeps the public demo traceable to the same source revision
that passed the release gates above.
