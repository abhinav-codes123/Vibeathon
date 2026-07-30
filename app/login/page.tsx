import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "./AuthForm";
import { safeReturnPath } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Secure customer and restaurant-team access for FlowDine AI.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next, "/account");
  const checkout = next.startsWith("/menu?checkout=1");
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">F</span>
        <span><b>FlowDine</b><small>Secure restaurant access</small></span>
      </Link>
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">{checkout ? "Verified customer checkout" : "Verified operations"}</p>
          <h1>
            {checkout ? <>Sign in once.<br />Track every course.</> : <>One identity.<br />The right workspace.</>}
          </h1>
          <p>
            {checkout
              ? "Your cart is waiting. Continue with Google or email, then place and track your order across devices."
              : "Sign in to access your customer orders or the restaurant workspace assigned to your membership."}
          </p>
          {checkout ? (
            <ul>
              <li>Your cart returns after sign-in</li>
              <li>Every order is linked to your verified account</li>
              <li>Kitchen updates synchronize across your devices</li>
            </ul>
          ) : (
            <ul>
              <li>Email confirmation before access</li>
              <li>Server-verified sessions on every protected request</li>
              <li>Database-backed customer and staff access</li>
            </ul>
          )}
        </div>
        <AuthForm
          next={next}
          initialError={params.error ?? ""}
        />
      </section>
      <p className="auth-footnote">
        Menu browsing, reservations, and queue access remain public. A verified account
        is required only when placing an order.
      </p>
    </main>
  );
}
