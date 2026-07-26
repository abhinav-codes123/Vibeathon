-- FlowDine AI production PostgreSQL/Supabase reference schema.
-- The hosted hackathon demo uses a transactionally versioned D1 state document;
-- this normalized schema is the production migration path.

create extension if not exists pgcrypto;

create type public.member_role as enum ('customer','kitchen','waiter','manager','owner');
create type public.order_status as enum ('received','confirmed','preparing','ready','served','completed','cancelled');
create type public.table_status as enum ('available','reserved','occupied','bill_requested','cleaning','out_of_service');
create type public.queue_status as enum ('waiting','seated','left');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text not null,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, profile_id)
);

create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  tax_percent numeric(5,2) not null default 5 check (tax_percent >= 0),
  service_charge_percent numeric(5,2) not null default 5 check (service_charge_percent >= 0),
  default_turnover_minutes integer not null default 75 check (default_turnover_minutes > 0),
  updated_at timestamptz not null default now()
);

create table public.operating_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique (restaurant_id, day_of_week)
);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  capacity integer not null check (capacity > 0),
  status public.table_status not null default 'available',
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

create table public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.dining_tables(id),
  guest_count integer not null check (guest_count > 0),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (restaurant_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id),
  name text not null,
  description text not null,
  price_minor integer not null check (price_minor >= 0),
  base_prep_minutes integer not null check (base_prep_minutes > 0),
  complexity smallint not null default 1 check (complexity between 1 and 3),
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  nutrition jsonb not null default '{}',
  image_url text,
  manually_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price_delta_minor integer not null default 0
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  unit text not null,
  par_quantity numeric(14,3) not null check (par_quantity >= 0),
  cost_per_unit numeric(14,4) not null default 0 check (cost_per_unit >= 0),
  unique (restaurant_id, name)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null unique references public.menu_items(id) on delete cascade,
  yield_portions numeric(10,2) not null default 1 check (yield_portions > 0)
);

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity_per_yield numeric(14,3) not null check (quantity_per_yield > 0),
  primary key (recipe_id, ingredient_id)
);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  usable_quantity numeric(14,3) not null check (usable_quantity >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  order_id uuid,
  delta numeric(14,3) not null,
  reason text not null,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid references public.profiles(id),
  guest_name text not null,
  phone text not null,
  party_size integer not null check (party_size > 0),
  reservation_at timestamptz not null,
  status text not null check (status in ('confirmed','seated','cancelled','no_show')),
  created_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  guest_name text not null,
  party_size integer not null check (party_size > 0),
  status public.queue_status not null default 'waiting',
  estimate_minutes integer not null check (estimate_minutes >= 0),
  joined_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_session_id uuid references public.table_sessions(id),
  customer_id uuid references public.profiles(id),
  order_number text not null,
  status public.order_status not null default 'received',
  subtotal_minor integer not null default 0 check (subtotal_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  service_minor integer not null default 0 check (service_minor >= 0),
  total_minor integer not null default 0 check (total_minor >= 0),
  estimate_minutes integer not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_number)
);

alter table public.inventory_movements
  add constraint inventory_movements_order_fk foreign key (order_id) references public.orders(id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  name_snapshot text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  allergens_snapshot text[] not null default '{}',
  notes text not null default ''
);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  name_snapshot text not null,
  price_delta_minor integer not null default 0
);

create table public.kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  priority smallint not null default 0,
  accepted_at timestamptz,
  started_at timestamptz,
  ready_at timestamptz
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null unique references public.orders(id),
  total_minor integer not null,
  status text not null check (status in ('open','paid','void')),
  created_at timestamptz not null default now()
);

create table public.bill_splits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  label text not null,
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'pending'
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  bill_id uuid not null references public.bills(id),
  amount_minor integer not null check (amount_minor >= 0),
  provider text not null default 'demo',
  provider_reference text,
  status text not null check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_session_id uuid references public.table_sessions(id),
  request_type text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  channel text not null default 'in_app',
  event_type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customer_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  spice_preference text
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid references public.orders(id),
  customer_id uuid references public.profiles(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  forecast_for timestamptz not null,
  expected_orders numeric(10,2) not null,
  method text not null,
  confidence text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.operational_insights (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  severity text not null,
  title text not null,
  body text not null,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index orders_restaurant_status_created_idx on public.orders (restaurant_id, status, created_at desc);
create index inventory_batches_ingredient_expiry_idx on public.inventory_batches (ingredient_id, expires_at);
create index reservations_restaurant_time_idx on public.reservations (restaurant_id, reservation_at);
create index queue_restaurant_status_joined_idx on public.queue_entries (restaurant_id, status, joined_at);
create index feedback_restaurant_created_idx on public.feedback (restaurant_id, created_at desc);
create index audit_restaurant_created_idx on public.audit_logs (restaurant_id, created_at desc);

alter table public.restaurants enable row level security;
alter table public.restaurant_memberships enable row level security;
alter table public.menu_items enable row level security;
alter table public.ingredients enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reservations enable row level security;
alter table public.queue_entries enable row level security;

create or replace function public.is_restaurant_member(target_restaurant uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.restaurant_memberships m
    where m.restaurant_id = target_restaurant and m.profile_id = auth.uid()
  );
$$;

create policy "public can read active menu"
  on public.menu_items for select using (not manually_paused);
create policy "members can read restaurant orders"
  on public.orders for select using (public.is_restaurant_member(restaurant_id));
create policy "members can read restaurant inventory"
  on public.inventory_batches for select using (public.is_restaurant_member(restaurant_id));
create policy "members can manage queue"
  on public.queue_entries for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
create policy "members can manage reservations"
  on public.reservations for all using (public.is_restaurant_member(restaurant_id))
  with check (public.is_restaurant_member(restaurant_id));
