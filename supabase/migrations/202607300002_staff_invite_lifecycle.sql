-- Invite-first restaurant staffing with manager-scoped administration.
-- Identity remains in Supabase Auth; authorization comes only from protected
-- restaurant memberships.

alter table public.staff_invitations
  add column if not exists full_name text;

alter table public.staff_invitations
  add column if not exists accepted_at timestamptz;

create or replace function public.is_restaurant_manager(target_restaurant uuid)
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
      and membership.role in ('manager', 'owner')
      and membership.status = 'active'
  );
$$;

revoke all on function public.is_restaurant_manager(uuid) from public;
grant execute on function public.is_restaurant_manager(uuid) to authenticated;

drop policy if exists "owners can read restaurant invitations"
  on public.staff_invitations;
create policy "managers can read restaurant invitations"
  on public.staff_invitations for select
  to authenticated
  using (public.is_restaurant_manager(restaurant_id));

drop policy if exists "owners can read restaurant memberships"
  on public.restaurant_memberships;
create policy "managers can read restaurant memberships"
  on public.restaurant_memberships for select
  to authenticated
  using (
    (select auth.uid()) = profile_id
    or public.is_restaurant_manager(restaurant_id)
  );

drop policy if exists "owners can read staff profiles"
  on public.profiles;
create policy "managers can read staff profiles"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or exists (
      select 1
      from public.restaurant_memberships manager_membership
      join public.restaurant_memberships staff_membership
        on staff_membership.restaurant_id = manager_membership.restaurant_id
      where manager_membership.profile_id = (select auth.uid())
        and manager_membership.role in ('manager', 'owner')
        and manager_membership.status = 'active'
        and staff_membership.profile_id = profiles.id
    )
  );

create or replace function public.manage_restaurant_staff(
  target_restaurant uuid,
  staff_name text,
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
  normalized_name text := nullif(trim(staff_name), '');
  actor_role public.member_role;
  target_profile uuid;
  target_confirmed_at timestamptz;
  existing_invitation_role public.member_role;
  existing_membership_role public.member_role;
  effective_status text;
  invitation_id uuid;
begin
  select membership.role
  into actor_role
  from public.restaurant_memberships membership
  where membership.restaurant_id = target_restaurant
    and membership.profile_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('manager', 'owner')
  limit 1;

  if actor_role is null then
    raise exception 'Manager or owner access is required.';
  end if;
  if staff_role not in ('kitchen', 'waiter', 'manager') then
    raise exception 'Only kitchen, waiter, or manager roles can be invited.';
  end if;
  if staff_status not in ('pending', 'active', 'inactive') then
    raise exception 'Invalid staff status.';
  end if;
  if normalized_name is null or length(normalized_name) > 100 then
    raise exception 'Invalid staff name.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid staff email.';
  end if;

  select invitation.role
  into existing_invitation_role
  from public.staff_invitations invitation
  where invitation.restaurant_id = target_restaurant
    and lower(invitation.email) = normalized_email
  limit 1;

  select auth_user.id, auth_user.email_confirmed_at
  into target_profile, target_confirmed_at
  from auth.users auth_user
  where lower(auth_user.email) = normalized_email
  limit 1;

  if target_profile is not null then
    select membership.role
    into existing_membership_role
    from public.restaurant_memberships membership
    where membership.restaurant_id = target_restaurant
      and membership.profile_id = target_profile
    limit 1;
  end if;

  if existing_membership_role = 'owner' then
    raise exception 'The restaurant owner cannot be changed through staff management.';
  end if;
  if actor_role = 'manager' and (
    staff_role = 'manager'
    or existing_invitation_role = 'manager'
    or existing_membership_role in ('manager', 'owner')
  ) then
    raise exception 'Only the owner can create or change manager access.';
  end if;

  effective_status := case
    when staff_status = 'inactive' then 'inactive'
    when target_profile is not null and target_confirmed_at is not null then 'active'
    else 'pending'
  end;

  insert into public.staff_invitations (
    restaurant_id,
    full_name,
    email,
    role,
    status,
    invited_by,
    accepted_at
  )
  values (
    target_restaurant,
    normalized_name,
    normalized_email,
    staff_role,
    effective_status,
    (select auth.uid()),
    case when effective_status = 'active' then now() else null end
  )
  on conflict (restaurant_id, email) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        status = excluded.status,
        invited_by = excluded.invited_by,
        accepted_at = case
          when excluded.status = 'active'
            then coalesce(public.staff_invitations.accepted_at, now())
          when excluded.status = 'pending'
            then null
          else public.staff_invitations.accepted_at
        end,
        updated_at = now()
  returning id into invitation_id;

  if target_profile is not null and target_confirmed_at is not null then
    insert into public.profiles (id, full_name)
    values (target_profile, normalized_name)
    on conflict (id) do update
      set full_name = coalesce(public.profiles.full_name, excluded.full_name),
          updated_at = now();

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
      case when effective_status = 'inactive' then 'inactive' else 'active' end
    )
    on conflict (restaurant_id, profile_id) do update
      set role = excluded.role,
          status = excluded.status;
  end if;

  return invitation_id;
end;
$$;

revoke all on function public.manage_restaurant_staff(
  uuid,
  text,
  text,
  public.member_role,
  text
) from public;
grant execute on function public.manage_restaurant_staff(
  uuid,
  text,
  text,
  public.member_role,
  text
) to authenticated;

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

  if new.email_confirmed_at is null then
    return new;
  end if;

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
    'active'
  from public.staff_invitations invitation
  where lower(invitation.email) = lower(new.email)
    and invitation.status in ('pending', 'active')
  on conflict (restaurant_id, profile_id) do update
    set role = excluded.role,
        status = excluded.status;

  update public.staff_invitations
  set status = 'active',
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data, email_confirmed_at, email
  on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.bootstrap_initial_owner(
  target_restaurant uuid,
  target_profile uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
begin
  perform pg_advisory_xact_lock(hashtext(target_restaurant::text));

  select lower(auth_user.email)
  into target_email
  from auth.users auth_user
  where auth_user.id = target_profile
    and auth_user.email_confirmed_at is not null;

  if target_email is null then
    raise exception 'A verified account is required for owner setup.';
  end if;
  if exists (
    select 1
    from public.restaurant_memberships membership
    where membership.restaurant_id = target_restaurant
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    return false;
  end if;

  insert into public.profiles (id)
  values (target_profile)
  on conflict (id) do nothing;

  insert into public.restaurant_memberships (
    restaurant_id,
    profile_id,
    role,
    status
  )
  values (target_restaurant, target_profile, 'owner', 'active')
  on conflict (restaurant_id, profile_id) do update
    set role = 'owner',
        status = 'active';

  return true;
end;
$$;

revoke all on function public.bootstrap_initial_owner(uuid, uuid) from public;
grant execute on function public.bootstrap_initial_owner(uuid, uuid) to service_role;

-- Repair pending invitations for accounts that were already verified before
-- this lifecycle migration was applied.
insert into public.restaurant_memberships (
  restaurant_id,
  profile_id,
  role,
  status
)
select
  invitation.restaurant_id,
  auth_user.id,
  invitation.role,
  'active'
from public.staff_invitations invitation
join auth.users auth_user
  on lower(auth_user.email) = lower(invitation.email)
where auth_user.email_confirmed_at is not null
  and invitation.status in ('pending', 'active')
on conflict (restaurant_id, profile_id) do update
  set role = excluded.role,
      status = excluded.status;

update public.staff_invitations invitation
set status = 'active',
    accepted_at = coalesce(invitation.accepted_at, now()),
    updated_at = now()
where invitation.status = 'pending'
  and exists (
    select 1
    from auth.users auth_user
    where lower(auth_user.email) = lower(invitation.email)
      and auth_user.email_confirmed_at is not null
  );
