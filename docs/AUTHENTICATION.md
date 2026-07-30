# FlowDine authentication setup

FlowDine keeps Cloudflare Sites and D1 for the hackathon restaurant state while
using Supabase Auth and PostgreSQL memberships for verified identity and staff
authorization.

## Security model

- Menu browsing, cart building, reservations, and queue entry remain public.
- Placing an order requires Google OAuth or a verified email session.
- The server stores the verified Supabase user ID on the order. `/api/orders`
  and `/api/orders/[orderId]` return only that account's records.
- Kitchen, waiter, manager, and owner workspaces require a verified Supabase
  session.
- The server reads the role from `restaurant_memberships`; the browser cannot
  choose or send an authoritative role.
- Manager copilot and all staff mutations use the same membership check.
- Public state responses remove customer orders, inventory, revenue, service
  requests, guest names, reservation phone numbers, and audit movements.

## 1. Create and migrate Supabase

Create a Supabase project, install the Supabase CLI, then run:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations create the normalized restaurant schema, profile trigger,
membership policies, and seeded Saffron Circuit restaurant.

## 2. Configure email/password

In Supabase Dashboard:

1. Open Authentication → Sign In / Providers → Email.
2. Enable email/password.
3. Require email confirmation.
4. Set the production Site URL to:
   `https://flowdine-ai.abhinavchaudhary484.chatgpt.site`
5. Add these exact redirect URLs:
   - `https://flowdine-ai.abhinavchaudhary484.chatgpt.site/auth/callback`
   - `http://localhost:3000/auth/callback`
6. Configure custom SMTP before relying on real email delivery.

## 3. Configure Google OAuth

In Google Auth Platform:

1. Create an OAuth client of type Web application.
2. Add the production site and `http://localhost:3000` as authorized JavaScript
   origins.
3. Copy the Supabase callback URL shown on the Supabase Google provider page
   into Google’s authorized redirect URIs.
4. Put the Google client ID and secret into the Supabase Google provider
   settings.
5. Enable the provider.

The browser returns to FlowDine’s `/auth/callback`, where the authorization code
is exchanged server-side and the verified session is stored in cookies.

## 4. Configure local and hosted variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=https://flowdine-ai.abhinavchaudhary484.chatgpt.site
```

Add the same values to the Sites production runtime before deploying. The
current sign-in and membership checks do not require a service-role key.

## 5. Bootstrap the owner account

Create and verify the owner account first, then bootstrap its membership once
in the Supabase SQL editor:

```sql
insert into public.restaurant_memberships (restaurant_id, profile_id, role)
select
  r.id,
  u.id,
  'owner'::public.member_role
from public.restaurants r
join auth.users u on u.email = 'kitchen@example.com'
where r.slug = 'saffron-circuit'
on conflict (restaurant_id, profile_id)
do update set role = excluded.role;
```

Only the initial owner bootstrap should use SQL. There is deliberately no
public first-user or browser-controlled role-claim endpoint.

## 6. Invite restaurant staff

After the owner signs in:

1. Open `/dashboard`.
2. Find **Staff roster**.
3. Enter the employee name, exact email, and kitchen, waiter, or manager role.
4. Select **Add invitation**.
5. Share the normal FlowDine signup link with that employee. The pilot does not
   send invitation email.
6. The employee must register or sign in with the invited email and complete
   email verification or Google OAuth.

The `owner_manage_staff` database function verifies the caller is an active
owner. If the account already exists, its membership is updated immediately.
If it does not exist, the profile trigger claims the invitation only when the
matching email completes authentication.

## 7. Required verification

Test all of the following before submission:

- Anonymous customers can browse and build a cart but cannot place an order.
- Google and email checkout return to the preserved cart.
- A placed order appears in `/orders` on another device using the same account.
- A different customer account cannot read or track that order.
- Kitchen and waiter status changes appear in the customer tracker.
- Unauthenticated users are redirected from `/kitchen`, `/staff`, and
  `/dashboard`.
- Customer accounts cannot open any staff workspace.
- Kitchen accounts can advance kitchen tickets but cannot restock.
- Waiter accounts can manage tables and service requests but cannot open the
  manager dashboard.
- Manager and owner accounts can open the command center.
- Managers cannot invite or deactivate staff.
- An owner invitation grants the selected role only to the matching verified
  email.
- Deactivating staff removes operational access after the next session refresh.
- Removing a membership removes access after session refresh.
- Editing or adding `x-demo-role` has no effect.
- Email confirmation, Google sign-in, sign-out, and password recovery all work
  on the production URL.
