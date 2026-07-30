# Database design

## Hosted demo: D1

The Sites deployment binds Cloudflare D1 as `DB`.

| Table group | Purpose |
|---|---|
| `restaurant_operations` | Opening state, guest-intake state, configuration, version, and write guard. |
| `menu_items`, `recipe_lines`, `inventory_items` | Configured menu, recipe quantities, usable stock, pause state, and par levels. |
| `orders`, `order_items`, `order_timeline` | Order facts, immutable item snapshots, and every role-owned handoff. |
| `dining_tables`, `queue_entries`, `reservations`, `service_requests` | Dining-room and host operations. |
| `inventory_movements` | Stock reservation, restoration, and restocking ledger. |
| `staff_members`, `audit_events` | Pilot roster plus actor/entity-level accountability. |

The app creates the normalized tables idempotently. On first request it imports
the existing `app_state` snapshot when present, otherwise it seeds Saffron
Circuit. `drizzle/0001_normalized_operations.sql` is the explicit migration.

All records affected by one operation are rewritten in an atomic, version-token
guarded D1 batch. A stale writer cannot modify entity tables because its token
never becomes active.

## Authentication runtime and production path: Supabase/PostgreSQL

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

`supabase/migrations/202607270001_flowdine_auth.sql` is used by the hackathon
runtime for verified profiles and restaurant memberships. It provisions profiles
from Supabase Auth, allows users to read only their own membership, and seeds the
Saffron Circuit restaurant. The single-restaurant staff migration assigns roles
through `owner_manage_staff`. Invitations are keyed by normalized email; after
that email completes verification, it receives the pre-authorized membership.

## RLS boundary

The migration enables RLS on the most sensitive tenant tables and provides initial membership-backed policies. It is a reference migration, not the runtime database of this demo. Before real use:

1. Add policies for every enabled table and every required operation.
2. Test the owner invitation trigger against a disposable Supabase project.
3. Test cross-tenant denial if the product later becomes multi-restaurant.
4. Run inventory/order writes in PostgreSQL transactions with row locks.
5. Add rate limits, idempotency keys, backups, and retention policy.
