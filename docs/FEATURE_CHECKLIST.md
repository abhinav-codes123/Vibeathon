# FlowDine AI feature checklist

## Shipped

- [x] Premium responsive landing, role rail, metadata, favicon, and generated Open Graph card
- [x] Public customer menu and cart with Google/email checkout, cart restoration, account-owned orders, cross-device history, and live tracking
- [x] Reservations and live queue join/leave with explainable estimates
- [x] Kitchen display with received, accepted, preparing, and ready checkpoints
- [x] Waiter priority queue, service requests, ready dishes, and table state controls
- [x] Manager opening/intake controls, factual daily summary, reservations, menu controls, metrics, stock risks, forecast, audit timeline, and export
- [x] Invite-first staff management with email delivery, verified acceptance, pending/active/inactive states, and automatic role landing
- [x] Owner-only manager creation plus manager-scoped kitchen/waiter administration
- [x] Deterministic insight engine and optional Gemini REST copilot with safe fallback
- [x] Normalized D1 persistence, atomic version-token batches, audit timeline, legacy import, seed data, and migration
- [x] Normalized Supabase/PostgreSQL production reference migration with tenant IDs and initial RLS
- [x] Server-side action permission matrix, input checks, security headers, and safe error responses
- [x] Unit tests, strict type check, lint, browser workflow checks, and mobile inspection
- [x] Architecture, database, judging, demo, configuration, and limitation documentation
- [x] Supabase email/password and Google OAuth flows with cookie-backed SSR sessions
- [x] Membership-backed staff routes, state reads, mutations, and manager copilot authorization
- [x] Public-state privacy projection and protected owner/manager staff memberships
- [x] Private customer-order APIs with server-verified ownership and cross-account isolation

## Explicit demo boundaries

- [x] Real email/Google authentication and membership-backed runtime authorization
- [ ] Live payment, notification, receipt, and export providers
- [ ] WebSocket/Supabase realtime transport
- [ ] 25–35 item production menu (demo seed has 18)
- [x] Single-restaurant operational-data migration from a D1 state document to normalized D1 tables
- [ ] Exhaustive multi-tenant RLS tests if multi-restaurant SaaS becomes a future goal
- [x] Live Supabase email and Google providers, confirmed email account, production Google callback, and owner workspace verification
- [ ] Live Gemini verification with a user-supplied API key
- [x] Public Sites deployment, D1 first-run seed, and production smoke test
