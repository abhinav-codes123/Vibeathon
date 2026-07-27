# FlowDine AI feature checklist

## Shipped

- [x] Premium responsive landing, role rail, metadata, favicon, and generated Open Graph card
- [x] Customer menu with search, category/dietary filters, recipe-derived availability, cart, notes, billing, and ordering
- [x] Reservations and live queue join/leave with explainable estimates
- [x] Kitchen display with age, lateness, allergen/notes, workload, and guarded transitions
- [x] Waiter priority queue, service requests, ready dishes, and table state controls
- [x] Manager metrics, revenue chart, digital twin, stock risks, restocking, demand forecast, live orders, and printable export
- [x] Deterministic insight engine and optional Gemini REST copilot with safe fallback
- [x] D1 shared persistence, optimistic concurrency, audit log, seed data, and migration
- [x] Normalized Supabase/PostgreSQL production reference migration with tenant IDs and initial RLS
- [x] Server-side action permission matrix, input checks, security headers, and safe error responses
- [x] Unit tests, strict type check, lint, browser workflow checks, and mobile inspection
- [x] Architecture, database, judging, demo, configuration, and limitation documentation
- [x] Supabase email/password and Google OAuth flows with cookie-backed SSR sessions
- [x] Membership-backed staff routes, state reads, mutations, and manager copilot authorization
- [x] Public-state privacy projection and administrator-assigned staff memberships

## Explicit demo boundaries

- [x] Real email/Google authentication and membership-backed runtime authorization
- [ ] Live payment, notification, receipt, and export providers
- [ ] WebSocket/Supabase realtime transport
- [ ] 25–35 item production menu (demo seed has 18)
- [ ] Full operational-data migration from D1 to Supabase and exhaustive cross-tenant RLS tests
- [ ] Live Supabase provider/runtime configuration and production sign-in verification
- [ ] Live Gemini verification with a user-supplied API key
- [x] Public Sites deployment, D1 first-run seed, and production smoke test
