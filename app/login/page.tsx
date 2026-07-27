import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./AuthForm";
import { safeReturnPath } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Secure staff access for FlowDine AI.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">F</span>
        <span><b>FlowDine</b><small>Secure restaurant access</small></span>
      </Link>
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Verified operations</p>
          <h1>One identity.<br />The right workspace.</h1>
          <p>
            Sign in to access the kitchen, floor-service, or management tools assigned
            to your restaurant membership.
          </p>
          <ul>
            <li>Email confirmation before access</li>
            <li>Google OAuth with a server-verified session</li>
            <li>Database-backed kitchen, waiter, manager, and owner roles</li>
          </ul>
        </div>
        <AuthForm
          next={safeReturnPath(params.next, "/account")}
          initialError={params.error ?? ""}
        />
      </section>
      <p className="auth-footnote">
        Guest menu, reservations, and queue access remain available without a staff
        account.
      </p>
    </main>
  );
}
