import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "../../../lib/auth";
import { OrderTracker } from "./OrderTracker";

export const metadata: Metadata = {
  title: "Track order",
  description: "Live preparation and service updates for your FlowDine order.",
};
export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const context = await getAuthContext();
  if (!context.user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);
  }

  return (
    <main className="customer-orders-page tracking-page">
      <header className="customer-page-nav">
        <Link className="auth-brand" href="/">
          <span className="brand-mark">F</span>
          <span><b>FlowDine</b><small>Live table service</small></span>
        </Link>
        <div>
          <Link className="button ghost" href="/orders">My orders</Link>
          <Link className="button ghost" href="/menu">Order more</Link>
        </div>
      </header>
      <OrderTracker orderId={orderId} />
    </main>
  );
}
