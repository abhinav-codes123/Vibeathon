-- Close every remaining public table to PostgREST access by default.
--
-- Tables that need browser access must receive an explicit tenant-scoped policy
-- in a later migration. Enabling RLS without a matching policy is intentionally
-- deny-by-default and prevents cross-restaurant data exposure.

alter table public.restaurant_settings enable row level security;
alter table public.operating_hours enable row level security;
alter table public.dining_tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_item_modifiers enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.kitchen_tickets enable row level security;
alter table public.bills enable row level security;
alter table public.bill_splits enable row level security;
alter table public.payments enable row level security;
alter table public.service_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.customer_preferences enable row level security;
alter table public.feedback enable row level security;
alter table public.demand_forecasts enable row level security;
alter table public.operational_insights enable row level security;
alter table public.audit_logs enable row level security;

-- These SECURITY DEFINER helpers are used only by RLS/trigger code. Remove the
-- default PUBLIC execute grant so they cannot be called directly by anonymous
-- API clients.
revoke all on function public.is_restaurant_member(uuid) from public;
grant execute on function public.is_restaurant_member(uuid) to authenticated;

revoke all on function public.handle_new_auth_user() from public;
