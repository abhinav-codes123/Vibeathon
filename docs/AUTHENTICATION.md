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
- Managers can administer kitchen/waiter access. Only owners can create or
  change manager access.
- Invitation acceptance requires the exact invited email to be verified.
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
   - `https://flowdine-ai.abhinavchaudhary484.chatgpt.site/auth/invite`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/invite`
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
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SECRET_KEY
FLOWDINE_BOOTSTRAP_OWNER_EMAIL=owner@example.com
```

Add the same values to the Sites production runtime before deploying. The
service-role key must remain server-only; it sends staff invitation emails and
performs the guarded initial-owner assignment.

## 5. Bootstrap the owner account

Set `FLOWDINE_BOOTSTRAP_OWNER_EMAIL` during restaurant setup. The matching
account must verify its email or use Google. When no active owner exists, the
server-only bootstrap function assigns that verified profile as owner. The
function is inaccessible to browser/authenticated clients and stops working as
soon as an owner exists.

## 6. Invite restaurant staff

After the owner or manager signs in:

1. Open `/dashboard`.
2. Find **Staff management**.
3. Enter the employee name, exact email, and permitted role.
4. Select **Send invitation**.
5. FlowDine creates a pending staff record and sends a Supabase invitation.
6. The employee opens the one-time invitation link. `/auth/invite` establishes
   the verified session, removes its tokens from the address bar, and routes the
   employee through `/workspace`.

The `manage_restaurant_staff` function permits managers to administer only
kitchen and waiter roles. Owners may additionally create and manage managers.
If the account already exists and is verified, its membership updates
immediately. Otherwise, the profile trigger activates the pending invitation
only after the matching email is verified.

After normal sign-in, `/workspace` routes automatically:

- Kitchen → `/kitchen`
- Waiter → `/staff`
- Manager or owner → `/dashboard`
- Customer → `/menu`

The built-in Supabase mailer is enough for a controlled pilot but is
rate-limited. Configure custom SMTP before sending production-scale staff
invitations. The app supports the standard Supabase invite template, so custom
template editing is not required.

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
- Managers can invite, reassign, activate, or deactivate kitchen/waiter staff.
- Managers cannot create, change, or deactivate managers or owners.
- Only owners can create or change manager access.
- An owner invitation grants the selected role only to the matching verified
  email.
- Deactivating staff removes operational access after the next session refresh.
- Removing a membership removes access after session refresh.
- Editing or adding `x-demo-role` has no effect.
- Email confirmation, Google sign-in, sign-out, and password recovery all work
  on the production URL.
