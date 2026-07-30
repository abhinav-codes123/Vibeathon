"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CustomerOrder } from "../../../lib/customer-orders";
import type { OrderStatus } from "../../../lib/types";

const stages: Array<{ status: OrderStatus; label: string; detail: string }> = [
  { status: "received", label: "Received", detail: "Your order reached the restaurant." },
  { status: "confirmed", label: "Confirmed", detail: "The kitchen accepted your order." },
  { status: "preparing", label: "Preparing", detail: "Your dishes are being prepared." },
  { status: "ready", label: "Ready", detail: "Your order is ready for table service." },
  { status: "served", label: "Served", detail: "Your dishes have reached the table." },
  { status: "completed", label: "Completed", detail: "Service and billing are complete." },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);

export function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [observedAt, setObservedAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        order?: CustomerOrder;
        error?: string;
      };
      if (!response.ok || !payload.order) {
        throw new Error(payload.error ?? "Unable to track this order.");
      }
      setOrder(payload.order);
      setObservedAt(Date.now());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to track this order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 3_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const promise = useMemo(() => {
    if (!order) return "";
    if (order.status === "cancelled") return "This order was cancelled.";
    if (["ready", "served", "completed"].includes(order.status)) {
      return order.status === "ready"
        ? "Ready for service"
        : order.status === "served"
          ? "Served at your table"
          : "Order completed";
    }
    const elapsed = Math.max(
      0,
      Math.floor((observedAt - new Date(order.createdAt).getTime()) / 60_000),
    );
    return `About ${Math.max(1, order.estimateMinutes - elapsed)} min remaining`;
  }, [observedAt, order]);

  if (loading) {
    return <div className="order-tracker-state">Connecting to the restaurant…</div>;
  }

  if (error || !order) {
    return (
      <div className="order-tracker-state error">
        <b>This order is unavailable.</b>
        <p>{error}</p>
        <Link className="button primary" href="/orders">Return to my orders</Link>
      </div>
    );
  }

  const currentIndex =
    order.status === "cancelled"
      ? -1
      : stages.findIndex((stage) => stage.status === order.status);

  return (
    <div className="order-tracker" aria-live="polite">
      <section className="tracking-summary">
        <div>
          <p className="eyebrow">Live order tracking</p>
          <h1>{order.number}</h1>
          <p>Table {order.table} · {order.guest}</p>
        </div>
        <div className={`tracking-promise status-${order.status}`}>
          <span>{order.status === "cancelled" ? "Cancelled" : stages[currentIndex]?.label}</span>
          <b>{promise}</b>
          <small>Updates automatically every 3 seconds</small>
        </div>
      </section>

      {order.status === "cancelled" ? (
        <section className="tracking-cancelled">
          <h2>Order cancelled</h2>
          <p>Please speak with the restaurant team if you need help placing another order.</p>
        </section>
      ) : (
        <ol className="tracking-steps">
          {stages.map((stage, index) => {
            const event = order.timeline.find((entry) => entry.status === stage.status);
            const state = index < currentIndex ? "complete" : index === currentIndex ? "active" : "";
            return (
              <li className={state} key={stage.status}>
                <span>{index < currentIndex ? "✓" : index + 1}</span>
                <div>
                  <b>{stage.label}</b>
                  <p>{stage.detail}</p>
                  {event && (
                    <small>
                      {new Date(event.createdAt).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </small>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section className="tracking-bill">
        <header>
          <div><p className="eyebrow">Order details</p><h2>Your table order</h2></div>
          <b>{money(order.total)}</b>
        </header>
        {order.items.map((item) => (
          <div className="tracking-line" key={item.menuItemId}>
            <span>{item.quantity} × {item.name}</span>
            <b>{money(item.unitPrice * item.quantity)}</b>
          </div>
        ))}
        {order.notes && <p className="tracking-note"><b>Preparation note</b>{order.notes}</p>}
      </section>
    </div>
  );
}
