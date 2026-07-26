# FlowDine AI implementation plan

## Product slice

Build one coherent, judge-ready restaurant operating system around Saffron Circuit. The primary proof is a shared order lifecycle: menu availability is derived from recipes and inventory, a customer places an order, kitchen staff advance it, stock and availability change atomically, and management metrics react.

## Architecture

- Vinext/Next.js App Router with strict TypeScript and accessible React client surfaces.
- Cloudflare D1 persistence for the deployed demo, with SQL migrations and first-run seed data.
- Polling-based live updates with stale/error recovery; mutations remain server-authoritative.
- Pure domain modules for availability, preparation time, queues, billing, forecasting, recommendations, permissions, and deterministic insights.
- Supabase-compatible PostgreSQL reference migration and environment contract for the requested production path.
- Dispatch-owned sign-in support for deployed identity plus an explicitly labeled, non-secret role-switching judge demo.

## Delivery phases

1. Foundation, design system, route shell, metadata, health endpoint.
2. Domain model, D1 schema, seed data, services, and state API.
3. Customer menu, cart, ordering, reservations, queue, tracking, and billing.
4. Kitchen display, waiter console, manager command center, inventory, analytics, and insights.
5. Unit/integration tests, lint, strict type-check, production build, browser smoke checks, docs, and deployment.

## Quality gates

- Critical mutations validate server-side and reject illegal transitions.
- Inventory never becomes negative; cancellation restores reserved stock.
- Unavailable or allergen-conflicting items cannot be ordered/recommended.
- All primary controls have working behavior, feedback, focus styles, and responsive layouts.
- The production build, lint, type-check, and domain test suite must pass before deployment.
