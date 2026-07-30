import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "../../lib/auth";
import { CustomerOrders } from "./CustomerOrders";

export const metadata: Metadata = {
  title: "My orders",
  description: "Track every FlowDine order linked to your verified account.",
};
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login?next=/orders");

  return (
    <main className="customer-orders-page">
      <header className="customer-page-nav">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">F</span>
          <span><b>FlowDine</b><small>Saffron Circuit</small></span>
        </Link>
        <div>
          <Link className="button ghost" href="/menu">Order more</Link>
          <Link className="button ghost" href="/account">Account</Link>
        </div>
      </header>
      <section className="customer-page-hero">
        <p className="eyebrow">Verified customer account</p>
        <h1>Your orders,<br />on every device.</h1>
        <p>
          Signed in as {context.user.email}. Kitchen and service updates appear here
          automatically.
        </p>
      </section>
      <CustomerOrders />
    </main>
  );
}
