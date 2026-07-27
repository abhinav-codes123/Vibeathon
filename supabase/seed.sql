-- Idempotent local/reference data for `supabase db reset`.
-- Authentication users and memberships are deliberately excluded because auth
-- identities must be created through Supabase Auth rather than seeded passwords.

insert into public.restaurants (id, name, slug, location, timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'Saffron Circuit',
  'saffron-circuit',
  'Bengaluru, India',
  'Asia/Kolkata'
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    location = excluded.location,
    timezone = excluded.timezone;

insert into public.restaurant_settings (
  restaurant_id,
  tax_percent,
  service_charge_percent,
  default_turnover_minutes
)
values ('00000000-0000-4000-8000-000000000001', 5, 5, 75)
on conflict (restaurant_id) do update
set tax_percent = excluded.tax_percent,
    service_charge_percent = excluded.service_charge_percent,
    default_turnover_minutes = excluded.default_turnover_minutes;

insert into public.operating_hours (
  restaurant_id,
  day_of_week,
  opens_at,
  closes_at,
  is_closed
)
select
  '00000000-0000-4000-8000-000000000001',
  day_of_week,
  time '18:00',
  time '23:00',
  false
from generate_series(0, 6) as day_of_week
on conflict (restaurant_id, day_of_week) do update
set opens_at = excluded.opens_at,
    closes_at = excluded.closes_at,
    is_closed = excluded.is_closed;

insert into public.dining_tables (id, restaurant_id, code, capacity, status)
values
  (
    '00000000-0000-4000-8001-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'T01',
    2,
    'available'
  ),
  (
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'T02',
    4,
    'available'
  ),
  (
    '00000000-0000-4000-8001-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'T03',
    6,
    'available'
  )
on conflict (id) do update
set code = excluded.code,
    capacity = excluded.capacity,
    status = excluded.status;

insert into public.menu_categories (id, restaurant_id, name, sort_order)
values (
  '00000000-0000-4000-8002-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Mains',
  10
)
on conflict (id) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.menu_items (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price_minor,
  base_prep_minutes,
  complexity,
  dietary_tags,
  allergens
)
values
  (
    '00000000-0000-4000-8003-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8002-000000000001',
    'Circuit Paneer Tikka',
    'Charred paneer, peppers, kasundi glaze',
    62500,
    18,
    2,
    array['vegetarian'],
    array['dairy']
  ),
  (
    '00000000-0000-4000-8003-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8002-000000000001',
    'Dal Makhani 18H',
    'Slow-cooked black lentils with cultured butter',
    49500,
    12,
    1,
    array['vegetarian'],
    array['dairy']
  )
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    price_minor = excluded.price_minor,
    base_prep_minutes = excluded.base_prep_minutes,
    complexity = excluded.complexity,
    dietary_tags = excluded.dietary_tags,
    allergens = excluded.allergens;
