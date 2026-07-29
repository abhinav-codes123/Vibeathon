# FlowDine AI complete QA and product audit

Date: 29 July 2026
Scope: source code, local runtime, desktop/mobile browser workflows, authorization, operational state transitions, production build, dependency security, and read-only production smoke checks.

## Executive verdict

FlowDine is a strong hackathon demonstration with a coherent guest-to-kitchen-to-floor-to-manager workflow. The deterministic inventory, guarded ticket lifecycle, public-state redaction, role gates, concurrency control, and no-key copilot fallback all worked in the controlled QA run.

It is **not ready to be sold tomorrow as a multi-restaurant SaaS**. The deployed operational store is still a single Saffron Circuit D1 state document, restaurant membership is not used to select a tenant store, staff API projections are broader than their job needs, and customer-created records are not tied to an authenticated customer or table session. A safe launch is a one-restaurant invited pilot with no real payments and no sensitive customer data.

## Test identities

The QA harness now supplies ten distinct identities. These identities are accepted only when all of the following are true:

- the runtime is not production;
- `FLOWDINE_TEST_MODE=1`;
- the private local test secret matches; and
- the bot identity matches its declared role.

| Role | Bot A | Bot B | Workspace |
|---|---|---|---|
| Customer | `customer-alpha@flowdine.test` | `customer-beta@flowdine.test` | Guest menu, reservation, and queue |
| Kitchen | `kitchen-alpha@flowdine.test` | `kitchen-beta@flowdine.test` | `/kitchen` |
| Waiter | `waiter-alpha@flowdine.test` | `waiter-beta@flowdine.test` | `/staff` |
| Manager | `manager-alpha@flowdine.test` | `manager-beta@flowdine.test` | `/dashboard` plus kitchen/floor |
| Owner | `owner-alpha@flowdine.test` | `owner-beta@flowdine.test` | `/dashboard` plus kitchen/floor |

These are controlled local QA users, not fake production Supabase accounts. Creating production bots would pollute live identity and restaurant data, while confirmed-email inboxes and a safe non-production Supabase tenant are not available.

## Feature coverage and result

| Area | Tested behavior | Result |
|---|---|---|
| Public experience | Landing, menu, search/filter presentation, cart persistence, reservation, queue join/leave, responsive rendering | Pass |
| Ordering | Place order, recipe-linked stock reservation, bill calculation, table occupancy, cart refresh | Pass |
| Kitchen | Confirmed to preparing to ready, role-specific transition denial, notes/allergens visibility | Pass |
| Waiter | Ready to served, service-request resolution, table transition, waiter-created order | Pass |
| Manager/owner | Pause menu, restock inventory, cancel order, mark paid, protected state, forecast, insights, local copilot | Pass |
| Authorization | Ten distinct identities, role/view matrix, anonymous denial, customer denial, cross-role escalation denial | Pass |
| Privacy baseline | Public projection removes inventory, movements, service requests, revenue, phone numbers, guest names, order items/notes/totals, and queue receipts | Pass |
| Abuse resistance | Malformed JSON, invalid quantity, past reservation, unusable table, queue-receipt IDOR, write rate limit | Pass |
| Concurrency | Three orders compete for two final portions; exactly two succeed and stock does not go negative | Pass |
| Accessibility | Serious/critical Axe checks on public, auth, kitchen, waiter, and manager pages on desktop/mobile | Partial: manager contrast defect |
| Build quality | Unit suite, TypeScript, ESLint, production Vinext build | Pass |
| Dependency security | Production dependency advisory audit | Pass: no known vulnerabilities |
| Live deployment | Health, public state, auth config, dashboard redirect, login/recovery/account gate | Pass, read-only |
| Email lifecycle | Real confirmation, sign-in, password reset email, recovery token, staff membership | Not end-to-end verified: no controlled inbox/test tenant |
| Google OAuth | Provider availability | Blocked: live configuration reports Google disabled |
| Gemini | Deterministic local fallback | Pass; live Gemini provider not verified without a supplied key |
| Payments/notifications | Provider settlement, receipts, SMS/email/push | Not implemented; payment is explicitly simulated |

## Automated evidence

- 18/18 deterministic domain and authorization tests passed.
- 28/28 Playwright scenarios passed. The known manager-dashboard color-contrast rule is explicitly waived in the regression assertion and remains an open defect below.
- All 12 implemented action types were executed successfully in the ten-bot workflow.
- TypeScript passed with no errors.
- ESLint passed with no errors.
- Vinext production build passed.
- `pnpm audit --prod` reported no known vulnerabilities.
- Production returned `200` for health, auth configuration, and public state.
- Production returned `307` from `/dashboard` to `/login?next=%2Fdashboard` when anonymous.
- Production login visibly offered email access and reported that Google sign-in is not enabled.

## Bugs and release blockers

### P1 — must fix before multi-restaurant or sensitive-data use

1. **The operational runtime is not tenant-scoped.** `readState()` and `updateState()` always use the seeded Saffron Circuit restaurant ID. The authenticated membership's `restaurantId` never selects a D1 row. A user assigned to another restaurant would still operate on the shared demo restaurant.

2. **Kitchen and waiter API responses exceed least privilege.** Any authorized protected view receives the complete internal `AppState`. A kitchen user calling `view=kitchen`, for example, can read reservation names/phone numbers, revenue history, inventory costs/movements, and queue management receipts even though the kitchen UI does not need them. Non-customer action responses also return the full internal state.

3. **Customer actions and records have no authenticated ownership.** Orders and reservations are not linked to the current user, device, or a server-issued table session. Any browser can request service for any active table, and a signed-in customer cannot securely retrieve only their own orders/reservations.

4. **Retries are not idempotent and the audit write is not atomic with the state write.** Repeating a successful `place_order`, `reserve`, or restock request can create a second operation. In D1, the state document commits before the separate audit insert; an audit failure can return an error after the business mutation already succeeded, encouraging a dangerous retry.

5. **Google OAuth is still disabled in production.** The UI now fails closed with a clear message, but the hackathon email-plus-Google requirement and the requested login flow are not complete until the provider is enabled and a real callback is verified.

### P2 — important operational defects

6. **Cancelling an order does not reconcile the table lifecycle.** A diagnostic order on T01 was cancelled, but T01 remained `occupied`. This can strand tables or distort occupancy when the cancelled order was the table's only active order.

7. **Reservations have no slot or capacity enforcement.** Two identical reservations for the same name, phone, date, and time were accepted. The action does not check operating hours, available capacity, duplicate phone/time, per-slot limits, or restaurant closure.

8. **Table state can diverge from orders and reservations.** Staff can progress an occupied table through bill requested, cleaning, and available without checking for active/unpaid orders. Reservations also do not allocate or hold a compatible table.

9. **Membership selection is arbitrary for multi-restaurant staff.** Authentication reads `.limit(1).maybeSingle()` with no active-restaurant selector. Once a user belongs to multiple restaurants, the selected membership is not deterministic or user-controlled.

10. **The D1 audit record cannot identify the human actor.** It stores only `actor_role` and action name—not the authenticated profile ID, entity ID, before/after state, outcome, request ID, or idempotency key. Two managers are indistinguishable.

11. **Public state still exposes detailed operational activity.** Personal fields are redacted, but public clients receive order numbers, table numbers, statuses/timestamps, reservation slots/party sizes, and all table states. This can reveal live occupancy and service volume unnecessarily.

12. **Manager dashboard text misses WCAG AA contrast.** Axe found one serious `color-contrast` rule violation covering several small labels on both desktop and mobile runs. Examples include `#7c7c75` on `#fffdf8` at 9px (4.13:1, below the required 4.5:1) and lighter 7–8px labels with still lower contrast. Public, auth, kitchen, and waiter checks passed.

### P3 — usability and product-completeness issues

13. **Owner has no owner-specific experience.** Owner and manager share the same dashboard and the hard-coded greeting `Good evening, Priya.`, regardless of the signed-in profile.

14. **The queue is customer-only, not a complete host workflow.** Guests can join or leave, but staff cannot call, notify, seat, reorder, merge, or mark no-show parties from the UI.

15. **Reservations have no restaurant workflow.** There is no staff reservation calendar, seat/cancel/no-show action, reminder, deposit, or waitlist conversion.

16. **Polling replaces realtime.** Every client reloads state every four seconds. It is acceptable for the demo but produces unnecessary reads and visible delay under real service load.

17. **The “Export service brief” is only browser print.** There is no generated PDF/CSV export record, branding control, delivery, or audit trail.

18. **Payment state is simulated.** `mark_paid` records an internal boolean with no payment-provider verification, refunds, reconciliation, receipt, tax invoice, or webhook idempotency.

## Improvements in recommended order

### Production foundation

1. Move operational writes to normalized PostgreSQL/Supabase tables and make `restaurant_id` mandatory in every query and mutation.
2. Add tenant-aware server services that resolve restaurant from the verified membership—never from client input—and cross-tenant security tests for every role.
3. Return separate kitchen, waiter, manager, and public projections. Minimize PII and management receipts by role.
4. Introduce table sessions and bind a QR/session receipt to ordering, service requests, bills, and customer order tracking.
5. Add idempotency keys and transactional mutation/audit/outbox writes.
6. Add actor ID, entity, request ID, outcome, before/after metadata, retention, and an owner audit viewer.
7. Enable Google OAuth, require email confirmation, configure production SMTP, and test sign-up/reset/callback flows with controlled inboxes.
8. Integrate a real payment provider only after webhook verification, replay protection, refund handling, and financial reconciliation exist.

### Restaurant operations

1. Build host queue and reservation workspaces with capacity-aware time slots, table assignment, call/seat/no-show, and automated reminders.
2. Reconcile table state from table sessions and active orders instead of independent button transitions.
3. Add menu modifier groups, item-level notes, course firing, void reasons, manager overrides, and immutable stock corrections.
4. Replace polling with Supabase Realtime or a durable event stream, retaining polling as fallback.
5. Add shift open/close, cash-up, printer/KDS routing, offline queueing, and conflict-resolution UI.

### UX and accessibility

1. Personalize greetings and navigation using the verified profile and membership.
2. Add “My orders/reservations/queue” views based on authenticated ownership or secure guest receipts.
3. Show explicit last-synced/degraded/offline status and preserve pending mutations safely.
4. Add keyboard-only and screen-reader manual checks, reduced-motion verification, and real-device iOS/Android testing.
5. Add clear empty states for a newly onboarded restaurant instead of relying only on Saffron Circuit seed data.

## Differentiated feature opportunities

| Feature | Why it is distinctive | First practical version |
|---|---|---|
| **Promise Engine** | Gives each table an explainable promise based on recipe time, current KDS load, table course, and stock—not a generic ETA. | Per-item confidence band with reasons and automatic guest/staff warning when risk changes. |
| **Ingredient Impact Graph** | Shows exactly which dishes, reservations, and forecasted sales are affected by one low-stock ingredient. | Click an ingredient to see portions at risk, projected lost revenue, substitute dishes, and recommended reorder. |
| **Service Recovery Autopilot** | Detects when delay, repeated requests, or table dwell predicts dissatisfaction, then proposes a bounded recovery action. | Manager-approved dessert/discount/message suggestions with evidence and cost cap; never auto-apply. |
| **Capacity-aware Reservation Twin** | Treats reservations, queue, table shape, kitchen capacity, and menu demand as one forecast instead of separate calendars. | Recommend slots and table assignments that avoid a kitchen spike; show the reason to hosts. |
| **Allergen Chain of Custody** | Makes allergen handling verifiable from guest selection through waiter confirmation, kitchen station, and handoff. | Required acknowledgements, station sanitation checklist, immutable timestamps, and manager exception review. |
| **Waste-to-Margin Coach** | Connects prep waste, expiries, recipe yield, pausing, and menu promotion to contribution margin. | Daily variance board with deterministic causes and one-click approved actions. |
| **Fair Kitchen Load Balancer** | Routes or sequences tickets using station capacity and promised times while keeping the logic visible to chefs. | Station workload board with suggested firing order and human override. |
| **Guest-controlled Split & Settle** | Lets diners split by item/person, pay independently, and keeps table/payment state consistent. | Secure table-session link, item claiming, provider-backed payments, partial settlement, and receipt delivery. |
| **Multi-location Owner Pulse** | Gives owners comparable operations without leaking guest PII or flattening local context. | Cross-location exception dashboard with tenant-safe aggregates and drill-down only when authorized. |
| **Evidence Ledger for AI Advice** | Makes every copilot recommendation auditable and reversible. | Store prompt context hashes, cited metrics, proposed action, human decision, and measured outcome. |

## Recommended next milestone

Build one production-shaped vertical slice before adding more dashboard features:

1. one real Supabase restaurant tenant;
2. one owner, two managers, two kitchen users, two waiters, and two controlled customers;
3. tenant-scoped menu, table session, order, kitchen ticket, inventory movement, and audit/outbox tables;
4. least-privilege API projections;
5. idempotent order placement and staff transitions;
6. email confirmation plus Google OAuth;
7. cross-tenant, cross-role, and cross-customer tests;
8. one controlled restaurant pilot with simulated payment.

Only after that slice passes should the app accept real payments or onboard a second restaurant.
