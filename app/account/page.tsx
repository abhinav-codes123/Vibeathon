import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, workspacePathForRole } from "../../lib/auth";

export const metadata: Metadata = { title: "Account access" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login?next=/account");

  const workspaceHref = workspacePathForRole(context.role);

  return (
    <main className="account-page">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">F</span>
        <span><b>FlowDine</b><small>Account access</small></span>
      </Link>
      <section className="account-card">
        <p className="eyebrow">Verified session</p>
        <h1>{context.membership ? "Your restaurant workspace is ready." : "Your account is verified."}</h1>
        <div className="account-details">
          <span>Email</span><b>{context.user.email}</b>
          <span>Role</span><b className="role-chip">{context.role ?? "customer"}</b>
          <span>Restaurant</span><b>{context.membership?.restaurantName ?? "No staff membership assigned"}</b>
        </div>
        {!context.membership && (
          <p className="account-notice">
            Staff access is invitation-only. Ask the restaurant owner to assign this
            verified email a kitchen, waiter, manager, or owner membership.
          </p>
        )}
        <div className="account-actions">
          <Link className="button primary" href={workspaceHref}>Open workspace</Link>
          <Link className="button ghost" href="/orders">My orders</Link>
          <form action="/auth/signout" method="post">
            <button className="button ghost" type="submit">Sign out</button>
          </form>
        </div>
      </section>
    </main>
  );
}
