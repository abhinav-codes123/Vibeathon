-- Owner-managed staff invitations for the Saffron Circuit pilot.
-- This migration keeps identity in Supabase Auth while operational state stays
-- in the Sites D1 database.

alter table public.restaurant_memberships
  add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive'));

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null,
  role public.member_role not null check (role <> 'owner'),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'inactive')),
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, email)
);

alter table public.staff_invitations enable row level security;

create or replace function public.is_restaurant_owner(target_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurant_memberships membership
    where membership.restaurant_id = target_restaurant
      and membership.profile_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  );
$$;

revoke all on function public.is_restaurant_owner(uuid) from public;
grant execute on function public.is_restaurant_owner(uuid) to authenticated;

create policy "owners can read restaurant invitations"
  on public.staff_invitations for select
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

create policy "owners can read restaurant memberships"
  on public.restaurant_memberships for select
  to authenticated
  using (
    (select auth.uid()) = profile_id
    or public.is_restaurant_owner(restaurant_id)
  );

create policy "owners can read staff profiles"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or exists (
      select 1
      from public.restaurant_memberships owner_membership
      join public.restaurant_memberships staff_membership
        on staff_membership.restaurant_id = owner_membership.restaurant_id
      where owner_membership.profile_id = (select auth.uid())
        and owner_membership.role = 'owner'
        and owner_membership.status = 'active'
        and staff_membership.profile_id = profiles.id
    )
  );

create or replace function public.owner_manage_staff(
  target_restaurant uuid,
  staff_email text,
  staff_role public.member_role,
  staff_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(staff_email));
  target_profile uuid;
  invitation_id uuid;
begin
  if not public.is_restaurant_owner(target_restaurant) then
    raise exception 'Owner access is required.';
  end if;
  if staff_role not in ('kitchen', 'waiter', 'manager') then
    raise exception 'Only kitchen, waiter, or manager roles can be invited.';
  end if;
  if staff_status not in ('pending', 'active', 'inactive') then
    raise exception 'Invalid staff status.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid staff email.';
  end if;

  insert into public.staff_invitations (
    restaurant_id,
    email,
    role,
    status,
    invited_by
  )
  values (
    target_restaurant,
    normalized_email,
    staff_role,
    staff_status,
    (select auth.uid())
  )
  on conflict (restaurant_id, email) do update
    set role = excluded.role,
        status = excluded.status,
        invited_by = excluded.invited_by,
        updated_at = now()
  returning id into invitation_id;

  select auth.users.id
  into target_profile
  from auth.users
  where lower(auth.users.email) = normalized_email
  limit 1;

  if target_profile is not null then
    insert into public.profiles (id)
    values (target_profile)
    on conflict (id) do nothing;

    insert into public.restaurant_memberships (
      restaurant_id,
      profile_id,
      role,
      status
    )
    values (
      target_restaurant,
      target_profile,
      staff_role,
      case when staff_status = 'inactive' then 'inactive' else 'active' end
    )
    on conflict (restaurant_id, profile_id) do update
      set role = excluded.role,
          status = excluded.status;
  end if;

  return invitation_id;
end;
$$;

revoke all on function public.owner_manage_staff(uuid, text, public.member_role, text) from public;
grant execute on function public.owner_manage_staff(uuid, text, public.member_role, text)
  to authenticated;

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

  insert into public.restaurant_memberships (
    restaurant_id,
    profile_id,
    role,
    status
  )
  select
    invitation.restaurant_id,
    new.id,
    invitation.role,
    case when invitation.status = 'inactive' then 'inactive' else 'active' end
  from public.staff_invitations invitation
  where lower(invitation.email) = lower(new.email)
    and invitation.status in ('pending', 'active')
  on conflict (restaurant_id, profile_id) do update
    set role = excluded.role,
        status = excluded.status;

  update public.staff_invitations
  set status = 'active',
      updated_at = now()
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;
