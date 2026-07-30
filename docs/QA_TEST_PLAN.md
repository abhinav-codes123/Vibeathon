# FlowDine production-readiness test plan

## Objective

Validate FlowDine as a connected restaurant product, not as a collection of
screens. The release gate covers startup, authentication, authorization,
customer operations, kitchen and waiter workflows, inventory, billing,
analytics, resilience, accessibility, security, migrations, and deployment.

## Environments

| Environment | Purpose | Data policy |
|---|---|---|
| Local Next development (`FLOWDINE_LOCAL=1`) | Deterministic public and staff workflow tests | In-memory state, reset by server restart |
| Hosted Supabase project | Identity configuration, RLS, and migration verification | Non-destructive inspection only |
| Sites production deployment | Production routing, headers, provider status, and smoke tests | No destructive state reset |

The branch operational state uses normalized D1 tables for one restaurant. It
is not treated as a multi-tenant test database.

## Feature inventory

| Capability | Status | Evidence / boundary |
|---|---|---|
| Public menu, search, dietary/category filters | Implemented | Browser and accessibility tests |
| Cart and dine-in order | Implemented for same-device guest | Local persistence; server prices and stock authoritative |
| Kitchen, waiter, manager dashboards | Implemented for one restaurant | Supabase membership guard; automated role seam local-only |
| Queue and reservation | Implemented pilot flow | Queue receipt ownership; host seating/cancellation checkpoints; no capacity allocator |
| Table and service lifecycle | Implemented basic flow | Transition graph and duplicate request guards |
| Inventory and recipe availability | Implemented in normalized D1 | Atomic final-portion test and movement ledger |
| Simulated billing | Implemented demo-only | No real gateway, refunds, invoice/tax compliance, or payment webhooks |
| Analytics and AI copilot | Implemented demo aggregates/fallback | Not tenant production data; Gemini optional |
| Customer history, private tracking, preferences | Not implemented | No order/reservation/bill ownership binding |
| Notifications | Schema/roadmap only | No delivery pipeline or user-facing notification center |
| Staff invitation lifecycle | Implemented | Manager/owner RPC, protected membership claim, hosted migration applied |
| Multi-restaurant isolation | Out of scope | Operational D1 records intentionally belong to Saffron Circuit |

## Automated suites

1. Domain and validation unit tests
   - recipe availability and final portions
   - pricing and paise-safe splitting
   - order transitions and cancellation inventory policy
   - queue ownership capability
   - table transitions and mutation validation
   - provider fail-closed behavior
2. API integration tests
   - public state redaction
   - malformed mutation rejection
   - unauthenticated privileged mutation denial
   - manager copilot denial
   - protected view denial
3. Browser tests
   - Chromium desktop and mobile
   - landing, navigation, menu, filters, cart, order, reservation, queue
   - protected-route redirects and provider fallback
   - console and failed-request collection
   - accessibility scan on representative public routes
4. Production smoke
   - health, metadata, headers, deep routes, provider status
   - protected route and API denial
   - anonymous RLS read denial

## Master scenario

The executable scenario covers the implemented connected slice:

1. Open landing page.
2. Navigate to menu, search and filter.
3. Add normal and limited dishes.
4. Change quantities and enter a table and preparation note.
5. Place the order and verify the API/state/inventory result.
6. Open kitchen context, accept, start, and mark the ticket ready.
7. Open waiter context, mark served and request/resolve service.
8. Open manager context, verify inventory and analytics changes.
9. Complete a manager-authorized manual payment.
10. Exercise owner staff invitation, intake pause, reservation, and audit checks.
11. Sign out or remove the test role and confirm protected access denial.

Account verification, real Google OAuth, and inbox-driven password reset require
external account activation and are separately gated.

## Final-portion concurrency

Two independent requests submit the same last portion concurrently. Exactly one
must succeed, the other must receive a stock conflict, inventory must remain
non-negative, and exactly one set of inventory movements must persist.

## Viewports

- 375×667
- 390×844
- 768×1024
- 1366×768
- 1440×900

## Release gates

- No reproducible BLOCKER, CRITICAL, or HIGH defect in the implemented slice.
- Unit, integration, authorization, and browser suites pass without skipped
  critical assertions.
- Typecheck, lint, production build, and production startup pass.
- Clean migration and seed are verified in a disposable environment.
- Remaining product gaps and external-provider blockers are explicit.
