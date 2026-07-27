-- FlowDine authenticated staff access.
-- Apply after 202607260001_flowdine.sql.

alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "users can read own memberships"
  on public.restaurant_memberships for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy "members can read assigned restaurants"
  on public.restaurants for select
  to authenticated
  using (public.is_restaurant_member(id));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

insert into public.profiles (id, full_name)
select
  id,
  nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), '')
from auth.users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.restaurants (id, name, slug, location, timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'Saffron Circuit',
  'saffron-circuit',
  'Bengaluru, Karnataka',
  'Asia/Kolkata'
)
on conflict (slug) do nothing;
