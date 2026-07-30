"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CustomerOrder } from "../../lib/customer-orders";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);

const statusLabel: Record<CustomerOrder["status"], string> = {
  received: "Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function CustomerOrders() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const payload = (await response.json()) as {
        orders?: CustomerOrder[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load your orders.");
      setOrders(payload.orders ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 5_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  if (loading) {
    return <div className="customer-orders-state">Loading your live orders…</div>;
  }

  if (error) {
    return (
      <div className="customer-orders-state error">
        <b>Orders could not be loaded.</b>
        <p>{error}</p>
        <button className="button primary" onClick={() => void load()}>Try again</button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="customer-orders-state">
        <b>No orders on this account yet.</b>
        <p>Browse the menu, add dishes to your cart, and sign in at checkout.</p>
        <Link className="button primary" href="/menu">Browse the live menu</Link>
      </div>
    );
  }

  return (
    <section className="customer-order-list" aria-live="polite">
      {orders.map((order) => (
        <Link className="customer-order-card" href={`/orders/${order.id}`} key={order.id}>
          <div className="customer-order-card-head">
            <div>
              <span>{order.number}</span>
              <h2>{order.items.map((item) => item.name).slice(0, 2).join(", ")}</h2>
            </div>
            <em className={`status-${order.status}`}>{statusLabel[order.status]}</em>
          </div>
          <p>
            Table {order.table} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
            · {money(order.total)}
          </p>
          <small>
            {new Date(order.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </small>
          <b>Track this order →</b>
        </Link>
      ))}
    </section>
  );
}
