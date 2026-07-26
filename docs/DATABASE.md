# Database design

## Hosted demo: D1

The Sites deployment binds Cloudflare D1 as `DB`.

| Table | Purpose |
|---|---|
| `app_state` | One versioned JSON state per restaurant; supports simple atomic demo writes. |
| `audit_logs` | Mutation role, action, restaurant, and timestamp. |

The app creates both tables idempotently on first request and inserts the Saffron Circuit seed only when absent. `drizzle/0000_flowdine_state.sql` is the explicit migration.

This design is intentionally narrow: it delivers shared persistent state and optimistic concurrency without pretending a state document is the right high-volume restaurant data model.

## Production reference: Supabase/PostgreSQL

`supabase/migrations/202607260001_flowdine.sql` normalizes:

- profiles, restaurants, memberships, settings, and operating hours
- tables and table sessions
- menu categories, items, modifiers, recipes, and recipe ingredients
- ingredients, inventory batches, and movement ledger
- reservations and queue entries
- orders, order items, kitchen tickets, bills, splits, and payments
- service requests, notifications, preferences, feedback
- forecasts, operational insights, and audit logs

Every operational entity carries `restaurant_id` so tenant boundaries can be enforced and indexed. Money uses integer minor units. Inventory movements are append-only records linked to orders when relevant.

## RLS boundary

The migration enables RLS on the most sensitive tenant tables and provides initial membership-backed policies. It is a reference migration, not the runtime database of this demo. Before real use:

1. Add policies for every enabled table and every required operation.
2. Add profile creation and membership invite flows.
3. Test cross-tenant denial and service-role-only operations.
4. Run inventory/order writes in PostgreSQL transactions with row locks.
5. Add rate limits, idempotency keys, backups, and retention policy.
