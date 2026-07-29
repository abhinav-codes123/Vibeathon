"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  availabilityLabel,
  billFor,
  serviceSummary,
} from "../../lib/domain";
import { canAccessView } from "../../lib/authz";
import type {
  AppState,
  DemoAction,
  DiningTable,
  MenuItem,
  Order,
  Role,
} from "../../lib/types";

export type AppView = "home" | "menu" | "reserve" | "queue" | "kitchen" | "waiter" | "manager";

type StatePayload = {
  state: AppState;
  availability: Record<string, number>;
  forecast: {
    expectedOrders: number;
    confidence: string;
    risks: AppState["inventory"];
  };
  insights: { level: string; title: string; body: string }[];
};

type CartLine = { item: MenuItem; quantity: number };
type ActionResponse = {
  message?: string;
  error?: string;
  queueAccess?: {
    queueId: string;
    managementToken: string;
  };
};
type PublicAuthContext = {
  configured: boolean;
  user: { email: string } | null;
  membership: {
    restaurantId: string;
    restaurantName: string;
    restaurantSlug: string;
    role: Role;
  } | null;
  role: Role | null;
};

const roleViews: { role: Role; view: AppView; label: string; detail: string }[] = [
  { role: "customer", view: "menu", label: "Guest", detail: "Menu & ordering" },
  { role: "kitchen", view: "kitchen", label: "Kitchen", detail: "Live tickets" },
  { role: "waiter", view: "waiter", label: "Waiter", detail: "Tables & service" },
  { role: "manager", view: "manager", label: "Manager", detail: "Command center" },
];

const paths: Record<AppView, string> = {
  home: "/",
  menu: "/menu",
  reserve: "/reserve",
  queue: "/queue",
  kitchen: "/kitchen",
  waiter: "/staff",
  manager: "/dashboard",
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (!Number.isFinite(minutes) || minutes > 7 * 24 * 60) return "now";
  return minutes < 1 ? "now" : `${minutes}m`;
};

export function FlowDineApp({ initialView }: { initialView: AppView }) {
  const [view, setView] = useState<AppView>(initialView);
  const [data, setData] = useState<StatePayload | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [dietary, setDietary] = useState("All");
  const [auth, setAuth] = useState<PublicAuthContext | null>(null);
  const [accessError, setAccessError] = useState<{ status: number; message: string } | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const response = await fetch(`/api/state?view=${encodeURIComponent(view)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as StatePayload & { error?: string };
      if (!response.ok) {
        setAccessError({
          status: response.status,
          message: payload.error ?? "Unable to load live restaurant data.",
        });
        throw new Error(payload.error ?? "Unable to load live restaurant data.");
      }
      setData(payload);
      setError("");
      setAccessError(null);
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : "Connection interrupted.");
    }
  }, [view]);

  useEffect(() => {
    void fetch("/api/auth/context", { cache: "no-store" })
      .then((response) => response.json() as Promise<PublicAuthContext>)
      .then((payload) => setAuth(payload))
      .catch(() => setAuth(null));
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 4_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!data || cartHydrated) return;
    const hydrate = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem("flowdine-cart-v1") ?? "[]") as {
          menuItemId: string;
          quantity: number;
        }[];
        setCart(
          saved.flatMap((line) => {
            const item = data.state.menu.find((entry) => entry.id === line.menuItemId);
            return item && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 10
              ? [{ item, quantity: line.quantity }]
              : [];
          }),
        );
      } catch {
        window.localStorage.removeItem("flowdine-cart-v1");
      } finally {
        setCartHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [cartHydrated, data]);

  useEffect(() => {
    if (!cartHydrated) return;
    window.localStorage.setItem(
      "flowdine-cart-v1",
      JSON.stringify(
        cart.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
      ),
    );
  }, [cart, cartHydrated]);

  const navigate = (next: AppView) => {
    setView(next);
    setData(null);
    setAccessError(null);
    window.history.pushState({}, "", paths[next]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const perform = async (action: DemoAction) => {
    setBusy(true);
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(action),
      });
      const payload = (await response.json()) as ActionResponse;
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");
      setToast(payload.message ?? "Saved.");
      window.setTimeout(() => setToast(""), 3_200);
      await load(true);
      return payload;
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Action failed.");
      window.setTimeout(() => setToast(""), 4_000);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      return existing
        ? current.map((line) =>
            line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current, { item, quantity: 1 }];
    });
    setToast(`${item.name} added.`);
    window.setTimeout(() => setToast(""), 1_800);
  };

  if (!data && accessError) {
    const next = paths[view];
    return (
      <main className="route-state">
        <p className="eyebrow">{accessError.status === 503 ? "Setup required" : "Protected workspace"}</p>
        <h1>{accessError.message}</h1>
        <p>
          Staff screens use a verified Supabase session and a database-backed
          restaurant membership. Guest ordering remains public.
        </p>
        <div className="account-actions">
          {accessError.status !== 503 && (
            <Link className="button primary" href={`/login?next=${encodeURIComponent(next)}`}>
              Sign in securely
            </Link>
          )}
          <Link className="button ghost" href="/menu">Continue as guest</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-shell">
        <div className="brand-mark" aria-hidden="true">F</div>
        <p className="eyebrow">Saffron Circuit</p>
        <h1>Synchronizing the dining room.</h1>
        <div className="loading-line" />
        {error && <button onClick={() => void load()} className="button primary">Retry connection</button>}
      </main>
    );
  }

  const state = data.state;
  const activeOrders = state.orders.filter((order) => !["completed", "cancelled"].includes(order.status));

  const visibleRoleViews = roleViews.filter((item) => {
    if (item.role === "customer") return true;
    if (!auth?.role) return false;
    return canAccessView(
      auth.role,
      item.view === "kitchen" ? "kitchen" : item.view === "waiter" ? "waiter" : "manager",
    );
  });

  return (
    <div className={`app-shell view-${view}`}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")} aria-label="FlowDine AI home">
          <span className="brand-mark">F</span>
          <span><b>FlowDine</b><small>Saffron Circuit</small></span>
        </button>
        <div className={`live-pill ${state.restaurant.isOpen ? "" : "closed"}`}>
          <span />
          {state.restaurant.isOpen
            ? state.restaurant.acceptingOrders
              ? "Open · accepting orders"
              : "Open · orders paused"
            : "Closed"}
          <em>{timeAgo(state.updatedAt)}</em>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <button onClick={() => navigate("menu")}>Menu</button>
          <button onClick={() => navigate("reserve")}>Reserve</button>
          <button onClick={() => navigate("queue")}>Live queue</button>
        </nav>
        <Link className="account-button" href={auth?.user ? "/account" : "/login"}>
          {auth?.user ? (auth.membership?.role ?? "Account") : "Staff sign in"}
        </Link>
        <button className="cart-button" onClick={() => setCartOpen(true)}>
          Cart <span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>
        </button>
      </header>

      {view !== "home" && (
        <aside className="role-rail" aria-label="Restaurant workspaces">
          <p>Workspaces</p>
          {visibleRoleViews.map((item) => (
            <button
              key={item.role}
              className={view === item.view ? "active" : ""}
              onClick={() => navigate(item.view)}
            >
              <span>{item.label.slice(0, 1)}</span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </button>
          ))}
          <div className="rail-foot">
            <span className="status-dot" />
            <b>All systems synced</b>
            <small>Polling every 4 seconds</small>
          </div>
        </aside>
      )}

      <main className={view === "home" ? "main-home" : "main-content"}>
        {view === "home" && (
          <Home
            state={state}
            availability={data.availability}
            activeOrders={activeOrders}
            onNavigate={navigate}
          />
        )}
        {view === "menu" && (
          <Menu
            state={state}
            availability={data.availability}
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            dietary={dietary}
            setDietary={setDietary}
            addToCart={addToCart}
          />
        )}
        {view === "reserve" && <ReservationView state={state} perform={perform} busy={busy} />}
        {view === "queue" && <QueueView state={state} perform={perform} busy={busy} />}
        {view === "kitchen" && <Kitchen state={state} perform={perform} busy={busy} />}
        {view === "waiter" && <Waiter state={state} perform={perform} busy={busy} />}
        {view === "manager" && (
          <Manager
            data={data}
            perform={perform}
            busy={busy}
            activeOrders={activeOrders}
            role={auth?.role ?? null}
          />
        )}
      </main>

      {cartOpen && (
        <Cart
          lines={cart}
          state={state}
          busy={busy}
          onClose={() => setCartOpen(false)}
          onChange={(id, delta) =>
            setCart((current) =>
              current
                .map((line) =>
                  line.item.id === id
                    ? { ...line, quantity: Math.max(0, line.quantity + delta) }
                    : line,
                )
                .filter((line) => line.quantity > 0),
            )
          }
          onPlace={async (guest, table, notes) => {
            const ok = await perform({
                type: "place_order",
                guest,
                table,
                notes,
                items: cart.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })),
              });
            if (ok) {
              setCart([]);
              setCartOpen(false);
            }
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Home({
  state,
  availability,
  activeOrders,
  onNavigate,
}: {
  state: AppState;
  availability: Record<string, number>;
  activeOrders: Order[];
  onNavigate: (view: AppView) => void;
}) {
  const occupied = state.tables.filter((table) => table.status === "occupied").length;
  const limited = state.menu.filter((item) => availability[item.id] <= 5).length;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">The restaurant operating system</p>
          <h1>Every table.<br />Every ticket.<br /><i>In one flow.</i></h1>
          <p className="hero-lead">
            Saffron Circuit runs on a live digital twin that connects guest demand,
            kitchen capacity, table service, and ingredient stock in real time.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => onNavigate("menu")}>Explore the live menu</button>
            <button className="button ghost" onClick={() => onNavigate("manager")}>Open command center</button>
          </div>
          <div className="hero-proof">
            <span><b>18</b> recipe-linked dishes</span>
            <span><b>4 sec</b> live synchronization</span>
            <span><b>0</b> unavailable-item orders</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="restaurant-card">
            <div className="visual-head"><span>Live service</span><b>8:42 PM</b></div>
            <div className="visual-kpis">
              <div><small>Tables</small><b>{occupied}/16</b><em>occupied</em></div>
              <div><small>Kitchen</small><b>{activeOrders.length}</b><em>live tickets</em></div>
              <div><small>Queue</small><b>{state.queue.filter((q) => q.status === "waiting").length}</b><em>parties</em></div>
            </div>
            <div className="flow-line">
              <span className="flow-node active">Order</span><i />
              <span className="flow-node active">Kitchen</span><i />
              <span className="flow-node">Service</span><i />
              <span className="flow-node">Paid</span>
            </div>
            <div className="live-ticket">
              <span className="ticket-number">SC-104</span>
              <div><b>Circuit Butter Chicken</b><small>Table T08 · 24 min</small></div>
              <em>Preparing</em>
            </div>
            <div className="availability-strip">
              <div><span className="status-dot warning" /><b>{limited} stock risks</b><small>Menu adapted automatically</small></div>
              <button onClick={() => onNavigate("manager")}>View twin</button>
            </div>
          </div>
          <div className="floating-note">
            <span>Live insight</span>
            <b>Prawn Moilee limited to {availability.m4 ?? 0} portions</b>
            <small>Based on tiger prawn inventory</small>
          </div>
        </div>
      </section>
      <section className="role-preview">
        <div className="section-title">
          <p className="eyebrow">One truth, four focused experiences</p>
          <h2>A dining room that thinks together.</h2>
        </div>
        <div className="role-grid">
          {roleViews.map((item, index) => (
            <button key={item.role} onClick={() => onNavigate(item.view)}>
              <span>0{index + 1}</span>
              <h3>{item.label}</h3>
              <p>{[
                "Discover live availability, order with confidence, and track every course.",
                "Prioritize the right ticket, protect allergen notes, and control the pass.",
                "See every table and urgent request in one clear service queue.",
                "Understand revenue, stock, delays, demand, and the next best action.",
              ][index]}</p>
              <b>Explore workspace →</b>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>
      {action}
    </header>
  );
}

function Menu({
  state,
  availability,
  query,
  setQuery,
  category,
  setCategory,
  dietary,
  setDietary,
  addToCart,
}: {
  state: AppState;
  availability: Record<string, number>;
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  dietary: string;
  setDietary: (value: string) => void;
  addToCart: (item: MenuItem) => void;
}) {
  const categories = ["All", ...Array.from(new Set(state.menu.map((item) => item.category)))];
  const filtered = state.menu.filter((item) => {
    const matchQuery = `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase());
    const matchCategory = category === "All" || item.category === category;
    const matchDiet = dietary === "All" || item.dietary.includes(dietary as "vegetarian" | "vegan");
    return matchQuery && matchCategory && matchDiet;
  });
  return (
    <>
      <PageHeader
        eyebrow="Guest menu · inventory-aware"
        title="Dinner, without the guesswork."
        copy="Availability and preparation estimates update from the live kitchen and ingredient state."
        action={
          <div className={`service-promise ${state.restaurant.acceptingOrders ? "" : "closed"}`}>
            <span className={`status-dot ${state.restaurant.acceptingOrders ? "" : "warning"}`} />
            <b>
              {state.restaurant.acceptingOrders
                ? "Kitchen accepting orders"
                : "New orders temporarily paused"}
            </b>
            <small>
              {state.restaurant.acceptingOrders
                ? "Average promise: 24 min"
                : "Existing tickets continue normally"}
            </small>
          </div>
        }
      />
      <section className="filter-bar">
        <label className="search-field">
          <span>Search dishes</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try paneer, vegan, mild…" />
        </label>
        <select value={dietary} onChange={(event) => setDietary(event.target.value)} aria-label="Dietary filter">
          <option>All</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option>
        </select>
      </section>
      <div className="category-tabs" aria-label="Menu categories">
        {categories.map((item) => (
          <button key={item} aria-pressed={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>
      <section className="menu-grid">
        {filtered.map((item, index) => {
          const portions = availability[item.id] ?? 0;
          const available = availabilityLabel(portions);
          return (
            <article className="menu-card" key={item.id}>
              <div className="dish-image">
                <Image
                  src={item.image}
                  alt=""
                  width={800}
                  height={520}
                  loading={index < 3 ? "eager" : "lazy"}
                  unoptimized
                />
                <span className={`availability ${available.tone}`}><i />{available.label}</span>
              </div>
              <div className="dish-content">
                <div className="dish-title"><h2>{item.name}</h2><b>{money(item.price)}</b></div>
                <p>{item.description}</p>
                <div className="dish-meta">
                  <span>{item.dietary.includes("vegan") ? "Vegan" : item.dietary.includes("vegetarian") ? "Vegetarian" : "Non-vegetarian"}</span>
                  <span>{item.spice} spice</span><span>{item.basePrepMinutes} min base</span>
                </div>
                <div className="dish-footer">
                  <small>{item.calories} kcal · {item.allergens.length ? `Contains ${item.allergens.join(", ")}` : "No declared allergens"}</small>
                  <button
                    disabled={portions <= 0 || !state.restaurant.acceptingOrders}
                    onClick={() => addToCart(item)}
                    aria-label={`Add ${item.name} to cart`}
                  >
                    {!state.restaurant.acceptingOrders
                      ? "Orders paused"
                      : portions <= 0
                        ? "Paused"
                        : "Add +"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {!filtered.length && <div className="empty-state"><b>No dishes match those filters.</b><p>Try clearing a filter or searching another ingredient.</p></div>}
    </>
  );
}

function Cart({
  lines,
  state,
  busy,
  onClose,
  onChange,
  onPlace,
}: {
  lines: CartLine[];
  state: AppState;
  busy: boolean;
  onClose: () => void;
  onChange: (id: string, delta: number) => void;
  onPlace: (guest: string, table: string, notes: string) => Promise<void>;
}) {
  const [guest, setGuest] = useState("Demo Guest");
  const [table, setTable] = useState("T01");
  const [notes, setNotes] = useState("");
  const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const bill = billFor(subtotal, state.restaurant.taxPercent, state.restaurant.serviceChargePercent);
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <header><div><p className="eyebrow">Dine-in order</p><h2 id="cart-title">Your table cart</h2></div><button onClick={onClose} aria-label="Close cart">Close</button></header>
        <div className="cart-lines">
          {!lines.length && <div className="empty-state"><b>Your cart is ready for something memorable.</b><p>Add a live-available dish from the menu.</p></div>}
          {lines.map((line) => (
            <div className="cart-line" key={line.item.id}>
              <Image src={line.item.image} alt="" width={72} height={72} unoptimized />
              <div><b>{line.item.name}</b><small>{money(line.item.price)} each</small></div>
              <div className="stepper"><button onClick={() => onChange(line.item.id, -1)}>-</button><span>{line.quantity}</span><button onClick={() => onChange(line.item.id, 1)}>+</button></div>
            </div>
          ))}
        </div>
        <div className="order-fields">
          <label>Your name<input value={guest} onChange={(e) => setGuest(e.target.value)} /></label>
          <label>Table<select value={table} onChange={(e) => setTable(e.target.value)}>{state.tables.filter((row) => !["cleaning", "out_of_service"].includes(row.status)).map((row) => <option key={row.id}>{row.code}</option>)}</select></label>
          <label className="full">Dietary or preparation note<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No onion, allergy note, course timing…" /></label>
        </div>
        <div className="bill-summary">
          <p><span>Subtotal</span><b>{money(bill.subtotal)}</b></p>
          <p><span>GST</span><b>{money(bill.tax)}</b></p>
          <p><span>Service charge</span><b>{money(bill.service)}</b></p>
          <p className="grand"><span>Total</span><b>{money(bill.total)}</b></p>
        </div>
        <button
          className="button primary full-button"
          disabled={!lines.length || busy || !state.restaurant.acceptingOrders}
          onClick={() => void onPlace(guest, table, notes)}
        >
          {busy ? "Confirming with kitchen…" : "Place dine-in order"}
        </button>
        <small className="demo-note">
          {!state.restaurant.acceptingOrders
            ? "New orders are paused by the manager. Your cart will remain on this device."
            : "Payment is recorded manually for this pilot. Inventory is reserved server-side when the order is placed."}
        </small>
      </aside>
    </div>
  );
}

function ReservationView({ state, perform, busy }: { state: AppState; perform: (action: DemoAction) => Promise<ActionResponse | null>; busy: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: "Demo Guest", phone: "9876543210", partySize: 4, date: today, time: "20:30" });
  return (
    <>
      <PageHeader eyebrow="Smart reservations" title="Your table, right on time." copy="Capacity-aware reservations stay visible to both the host and dining-room teams." />
      <section className="split-layout">
        <form className="form-card" onSubmit={(e) => { e.preventDefault(); void perform({ type: "reserve", ...form }); }}>
          <h2>Reserve at Saffron Circuit</h2>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <div className="field-row">
            <label>Party size<input type="number" min={1} max={20} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })} /></label>
            <label>Date<input type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          </div>
          <label>Arrival time<select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}><option>19:00</option><option>19:30</option><option>20:00</option><option>20:30</option><option>21:00</option></select></label>
          <button className="button primary" disabled={busy}>Confirm reservation</button>
        </form>
        <div className="context-card"><p className="eyebrow">Tonight at a glance</p><h2>{state.reservations.filter((r) => r.status === "confirmed").length} confirmed parties</h2><p>We’ll hold your table for 15 minutes. Live queue backup is available if your plans change.</p><div className="time-slots">{["19:00 · Good", "19:30 · Good", "20:00 · Limited", "20:30 · Limited", "21:00 · Good"].map((slot) => <span key={slot}>{slot}</span>)}</div></div>
      </section>
    </>
  );
}

function QueueView({ state, perform, busy }: { state: AppState; perform: (action: DemoAction) => Promise<ActionResponse | null>; busy: boolean }) {
  const [name, setName] = useState("Demo Guest");
  const [partySize, setPartySize] = useState(2);
  const [queueAccess, setQueueAccess] = useState<ActionResponse["queueAccess"]>(undefined);
  const waiting = state.queue.filter((entry) => entry.status === "waiting");
  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("flowdine-queue-access-v1");
        if (stored) setQueueAccess(JSON.parse(stored) as NonNullable<ActionResponse["queueAccess"]>);
      } catch {
        window.localStorage.removeItem("flowdine-queue-access-v1");
      }
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);
  const joinQueue = async () => {
    const result = await perform({ type: "join_queue", name, partySize });
    if (result?.queueAccess) {
      setQueueAccess(result.queueAccess);
      window.localStorage.setItem("flowdine-queue-access-v1", JSON.stringify(result.queueAccess));
    }
  };
  const leaveQueue = async () => {
    if (!queueAccess) return;
    const result = await perform({
      type: "leave_queue",
      queueId: queueAccess.queueId,
      managementToken: queueAccess.managementToken,
    });
    if (result) {
      setQueueAccess(undefined);
      window.localStorage.removeItem("flowdine-queue-access-v1");
    }
  };
  return (
    <>
      <PageHeader eyebrow="Live queue" title="Know your wait before you wait." copy="Estimates account for party size, table capacity, occupancy duration, and parties ahead." />
      <section className="queue-layout">
        <form className="form-card compact" onSubmit={(e) => { e.preventDefault(); void joinQueue(); }}>
          <h2>Join the queue</h2>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Party size<input type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} /></label>
          <button className="button primary" disabled={busy}>Get live position</button>
        </form>
        <div className="queue-board">
          <div className="board-head"><div><p className="eyebrow">Host stand</p><h2>{waiting.length} parties waiting</h2></div><span className="live-pill"><i /> Live</span></div>
          {waiting.map((entry, index) => (
            <div className="queue-row" key={entry.id}>
              <span className="queue-position">{index + 1}</span>
              <div><b>{entry.name}</b><small>Party of {entry.partySize} · joined {timeAgo(entry.joinedAt)} ago</small></div>
              <strong>~{entry.estimateMinutes} min</strong>
              {queueAccess?.queueId === entry.id && (
                <button onClick={() => void leaveQueue()}>Leave</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Kitchen({ state, perform, busy }: { state: AppState; perform: (action: DemoAction) => Promise<ActionResponse | null>; busy: boolean }) {
  const columns: { status: Order["status"]; title: string; action?: string }[] = [
    { status: "received", title: "New orders", action: "Accept ticket" },
    { status: "confirmed", title: "Accepted", action: "Start preparing" },
    { status: "preparing", title: "Preparing", action: "Mark ready" },
    { status: "ready", title: "Ready at pass" },
  ];
  const active = state.orders.filter((o) => columns.some((column) => column.status === o.status));
  return (
    <>
      <PageHeader
        eyebrow="Kitchen display system"
        title="Run the pass, not the paperwork."
        copy="Oldest and at-risk tickets stay visible. Allergens and special instructions never hide."
        action={<div className="kitchen-load"><span>Kitchen pressure</span><b>{active.length > 5 ? "High" : active.length > 2 ? "Balanced" : "Light"}</b><i style={{ width: `${Math.min(100, active.length * 16 + 22)}%` }} /></div>}
      />
      <section className="kds-grid">
        {columns.map((column) => {
          const orders = state.orders.filter((order) => order.status === column.status);
          return (
            <div className="kds-column" key={column.status}>
              <header><h2>{column.title}</h2><span>{orders.length}</span></header>
              {orders.map((order) => (
                <Ticket
                  key={order.id}
                  order={order}
                  referenceTime={state.updatedAt}
                  action={column.action}
                  busy={busy}
                  onAdvance={() =>
                    perform({ type: "advance_order", orderId: order.id })
                  }
                />
              ))}
              {!orders.length && <div className="column-empty">No tickets here. The next update will appear automatically.</div>}
            </div>
          );
        })}
      </section>
    </>
  );
}

function Ticket({ order, referenceTime, action, busy, onAdvance }: { order: Order; referenceTime: string; action?: string; busy: boolean; onAdvance: () => Promise<ActionResponse | null> }) {
  const age = Math.max(0, Math.floor((new Date(referenceTime).getTime() - new Date(order.createdAt).getTime()) / 60_000));
  const delayed = age > order.estimateMinutes;
  return (
    <article className={`ticket ${delayed ? "delayed" : ""}`}>
      <header><div><span>{order.number}</span><b>{order.table}</b></div><strong>{age} min</strong></header>
      {delayed && <p className="delay-flag">Past promise by {age - order.estimateMinutes} min</p>}
      <ul>{order.items.map((line) => <li key={line.menuItemId}><b>{line.quantity}×</b> {line.name}</li>)}</ul>
      {order.notes && <p className="order-note"><b>Note</b>{order.notes}</p>}
      {order.allergens.length > 0 && <p className="allergen"><b>Allergens</b>{order.allergens.join(" · ")}</p>}
      <footer>
        <small>Promise {order.estimateMinutes} min</small>
        {action ? (
          <button disabled={busy} onClick={() => void onAdvance()}>{action}</button>
        ) : (
          <b className="handoff-state">Waiting for runner</b>
        )}
      </footer>
    </article>
  );
}

function Waiter({ state, perform, busy }: { state: AppState; perform: (action: DemoAction) => Promise<ActionResponse | null>; busy: boolean }) {
  const openRequests = state.serviceRequests.filter((request) => request.status === "open");
  const ready = state.orders.filter((order) => order.status === "ready");
  return (
    <>
      <PageHeader eyebrow="Floor service" title="The next right action, always visible." copy="Ready dishes, guest requests, and table turns are prioritized in one service queue." />
      <section className="waiter-grid">
        <div className="task-panel">
          <header><div><p className="eyebrow">Priority queue</p><h2>{openRequests.length + ready.length} actions now</h2></div></header>
          {ready.map((order) => (
            <div className="task-row urgent" key={order.id}><span>1</span><div><b>Run {order.number} to {order.table}</b><small>{order.items.map((i) => i.name).join(", ")}</small></div><button disabled={busy} onClick={() => void perform({ type: "advance_order", orderId: order.id })}>Served</button></div>
          ))}
          {openRequests.map((request, index) => (
            <div className="task-row" key={request.id}><span>{index + ready.length + 1}</span><div><b>{request.type === "bill" ? "Prepare bill" : request.type === "water" ? "Water requested" : "Guest needs assistance"} · {request.table}</b><small>Waiting {timeAgo(request.createdAt)}</small></div><button disabled={busy} onClick={() => void perform({ type: "resolve_request", requestId: request.id })}>Resolve</button></div>
          ))}
        </div>
        <div className="table-panel">
          <header><p className="eyebrow">Dining room</p><h2>Live table map</h2></header>
          <div className="table-grid">
            {state.tables.map((table) => <TableCard key={table.id} table={table} busy={busy} perform={perform} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function TableCard({ table, busy, perform }: { table: DiningTable; busy: boolean; perform: (action: DemoAction) => Promise<ActionResponse | null> }) {
  const next: Record<DiningTable["status"], DiningTable["status"]> = {
    available: "occupied", occupied: "bill_requested", bill_requested: "cleaning",
    cleaning: "available", reserved: "occupied", out_of_service: "available",
  };
  return (
    <article className={`table-card ${table.status}`}>
      <header><b>{table.code}</b><span>{table.seats} seats</span></header>
      <p>{table.status.replaceAll("_", " ")}</p>
      <small>{table.occupiedMinutes ? `${table.occupiedMinutes} min seated` : table.status === "available" ? "Ready to seat" : "Tap to advance"}</small>
      <button disabled={busy} onClick={() => void perform({ type: "set_table", tableId: table.id, status: next[table.status] })}>{next[table.status].replaceAll("_", " ")}</button>
    </article>
  );
}

function Manager({
  data,
  perform,
  busy,
  activeOrders,
  role,
}: {
  data: StatePayload;
  perform: (action: DemoAction) => Promise<ActionResponse | null>;
  busy: boolean;
  activeOrders: Order[];
  role: Role | null;
}) {
  const [question, setQuestion] = useState("What should I prioritize in the next 15 minutes?");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [copilotProvider, setCopilotProvider] = useState<"gemini" | "local">("local");
  const [copilotBusy, setCopilotBusy] = useState(false);
  const { state } = data;
  const occupied = state.tables.filter((table) => table.status === "occupied").length;
  const todayRevenue = state.revenueHistory.at(-1)?.revenue ?? 0;
  const avgOrder = Math.round(todayRevenue / Math.max(1, state.revenueHistory.at(-1)?.orders ?? 1));
  const low = state.inventory.filter((item) => item.quantity / item.par < 0.4).sort((a, b) => a.quantity / a.par - b.quantity / b.par);
  const maxRevenue = Math.max(...state.revenueHistory.map((row) => row.revenue));
  const summary = serviceSummary(state);
  const askCopilot = async () => {
    setCopilotBusy(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        provider?: "gemini" | "local";
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Copilot is unavailable.");
      setCopilotAnswer(payload.answer ?? "");
      setCopilotProvider(payload.provider ?? "local");
    } catch (cause) {
      setCopilotAnswer(cause instanceof Error ? cause.message : "Copilot is unavailable.");
      setCopilotProvider("local");
    } finally {
      setCopilotBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Operational command center"
        title="Good evening, Priya."
        copy="Here is the live state of Saffron Circuit and where your attention creates the most value."
        action={<button className="button ghost" onClick={() => window.print()}>Export service brief</button>}
      />
      <section className="metric-grid">
        <Metric label="Revenue today" value={money(todayRevenue)} change="+12.4% vs last Sunday" />
        <Metric label="Active orders" value={String(activeOrders.length)} change={`${activeOrders.filter((o) => o.status === "preparing").length} in preparation`} />
        <Metric label="Table occupancy" value={`${Math.round((occupied / state.tables.length) * 100)}%`} change={`${state.tables.length - occupied} tables turning or open`} />
        <Metric label="Average order" value={money(avgOrder)} change="+₹84 week over week" />
      </section>
      <section className="manager-grid">
        <div className="panel operations-panel">
          <header>
            <div>
              <p className="eyebrow">Daily controls</p>
              <h2>Service control</h2>
            </div>
            <span className={state.restaurant.isOpen ? "control-open" : "control-closed"}>
              {state.restaurant.isOpen ? "Open" : "Closed"}
            </span>
          </header>
          <div className="control-status">
            <div>
              <b>{state.restaurant.acceptingOrders ? "Guest orders enabled" : "New orders paused"}</b>
              <small>
                {activeOrders.length} active tickets and {summary.openServiceRequests} open service requests
              </small>
            </div>
            <button
              disabled={busy || !state.restaurant.isOpen}
              onClick={() =>
                void perform({
                  type: "set_accepting_orders",
                  accepting: !state.restaurant.acceptingOrders,
                })
              }
            >
              {state.restaurant.acceptingOrders ? "Pause intake" : "Resume intake"}
            </button>
          </div>
          <div className="control-actions">
            <button
              className="button ghost"
              disabled={busy || state.restaurant.isOpen}
              onClick={() => void perform({ type: "set_restaurant_open", open: true })}
            >
              Open restaurant
            </button>
            <button
              className="button danger-button"
              disabled={busy || !state.restaurant.isOpen}
              onClick={() => void perform({ type: "set_restaurant_open", open: false })}
            >
              Close day
            </button>
          </div>
          <small className="control-note">
            Closing is blocked until every ticket is completed or cancelled and every service
            request is resolved.
          </small>
        </div>
        <div className="panel summary-panel">
          <header>
            <div>
              <p className="eyebrow">Recorded facts</p>
              <h2>Current service summary</h2>
            </div>
            <span>Live</span>
          </header>
          <div className="summary-grid">
            <div><b>{summary.completedOrders}</b><small>completed orders</small></div>
            <div><b>{summary.cancelledOrders}</b><small>cancellations</small></div>
            <div><b>{summary.averagePreparationMinutes || "—"}</b><small>avg prep minutes</small></div>
            <div><b>{money(summary.recordedRevenue)}</b><small>recorded payments</small></div>
          </div>
          <p>
            These values come directly from order timelines and recorded manual payments.
            Copilot recommendations are shown separately below.
          </p>
        </div>
        <div className="panel revenue-panel">
          <header><div><p className="eyebrow">Revenue rhythm</p><h2>Seven-day performance</h2></div><span>This week</span></header>
          <div className="bar-chart" aria-label="Revenue by day">
            {state.revenueHistory.map((row) => (
              <div key={row.day}><b>{money(row.revenue)}</b><span style={{ height: `${(row.revenue / maxRevenue) * 100}%` }} /><small>{row.day}</small></div>
            ))}
          </div>
        </div>
        <div className="panel twin-panel">
          <header><div><p className="eyebrow">Living restaurant</p><h2>Digital twin</h2></div><span className="live-pill"><i /> Live</span></header>
          <div className="twin-stats">
            <div><span className="ring" style={{ "--progress": `${(occupied / state.tables.length) * 100}%` } as React.CSSProperties}><b>{occupied}</b></span><small>occupied tables</small></div>
            <div><span className="ring amber" style={{ "--progress": `${Math.min(100, activeOrders.length * 13)}%` } as React.CSSProperties}><b>{activeOrders.length}</b></span><small>active tickets</small></div>
            <div><span className="ring red" style={{ "--progress": `${Math.min(100, low.length * 22)}%` } as React.CSSProperties}><b>{low.length}</b></span><small>stock risks</small></div>
          </div>
          <div className="pressure"><span>Kitchen pressure</span><b>{activeOrders.length > 5 ? "High" : "Balanced"}</b><i><em style={{ width: `${Math.min(100, 28 + activeOrders.length * 11)}%` }} /></i></div>
        </div>
        <div className="panel insights-panel">
          <header><div><p className="eyebrow">Operations copilot · {copilotProvider === "gemini" ? "Gemini" : "Local engine"}</p><h2>What needs attention</h2></div></header>
          {data.insights.map((insight) => (
            <article key={insight.title} className={insight.level}><span /><div><b>{insight.title}</b><p>{insight.body}</p></div></article>
          ))}
          <div className="copilot-ask">
            <label htmlFor="copilot-question">Ask about this live service</label>
            <div>
              <input id="copilot-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} />
              <button disabled={copilotBusy || !question.trim()} onClick={() => void askCopilot()}>{copilotBusy ? "Thinking…" : "Ask"}</button>
            </div>
            {copilotAnswer && <p className="copilot-answer">{copilotAnswer}</p>}
            <small>Advisory only. Deterministic operational signals remain authoritative.</small>
          </div>
        </div>
        <div className="panel inventory-panel">
          <header><div><p className="eyebrow">Inventory risk</p><h2>Stockout watch</h2></div><b>{low.length} risks</b></header>
          {low.slice(0, 5).map((item) => {
            const percent = Math.round((item.quantity / item.par) * 100);
            return (
              <div className="inventory-row" key={item.id}>
                <div><b>{item.name}</b><small>{item.quantity.toFixed(0)} {item.unit} usable · {percent}% of par</small><i><em style={{ width: `${percent}%` }} /></i></div>
                <button disabled={busy} onClick={() => void perform({ type: "restock", ingredientId: item.id, quantity: Math.ceil(item.par * 0.5) })}>Restock +50%</button>
              </div>
            );
          })}
        </div>
        <div className="panel menu-control-panel">
          <header>
            <div><p className="eyebrow">Menu control</p><h2>Live availability overrides</h2></div>
            <span>{state.menu.filter((item) => item.paused).length} paused</span>
          </header>
          <div className="compact-list">
            {state.menu.slice(0, 8).map((item) => (
              <div key={item.id}>
                <span>
                  <b>{item.name}</b>
                  <small>{item.category} · {item.paused ? "Manually paused" : "Live"}</small>
                </span>
                <button
                  disabled={busy}
                  onClick={() => void perform({ type: "toggle_pause", menuItemId: item.id })}
                >
                  {item.paused ? "Resume" : "Pause"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="panel reservations-panel">
          <header>
            <div><p className="eyebrow">Host operations</p><h2>Today’s reservations</h2></div>
            <span>{state.reservations.filter((entry) => entry.status === "confirmed").length} due</span>
          </header>
          <div className="compact-list">
            {state.reservations.slice(0, 6).map((reservation) => (
              <div key={reservation.id}>
                <span>
                  <b>{reservation.name} · {reservation.time}</b>
                  <small>Party of {reservation.partySize} · {reservation.status}</small>
                </span>
                {reservation.status === "confirmed" && (
                  <span className="inline-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        void perform({
                          type: "set_reservation_status",
                          reservationId: reservation.id,
                          status: "seated",
                        })
                      }
                    >
                      Seat
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void perform({
                          type: "set_reservation_status",
                          reservationId: reservation.id,
                          status: "cancelled",
                        })
                      }
                    >
                      Cancel
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="panel forecast-panel">
          <header><div><p className="eyebrow">Explainable forecast</p><h2>Tonight’s second wave</h2></div><span>{data.forecast.confidence} confidence</span></header>
          <div className="forecast-number"><b>{data.forecast.expectedOrders}</b><span>expected orders</span><small>Weighted four-day moving average</small></div>
          <div className="mini-chart">
            {state.hourlyDemand.map((row) => <div key={row.hour}><i style={{ height: `${row.forecast * 3.2}px` }} /><span>{row.hour}</span></div>)}
          </div>
        </div>
        <div className="panel orders-panel">
          <header><div><p className="eyebrow">Live orders</p><h2>Service flow</h2></div><span>{activeOrders.length} active</span></header>
          {activeOrders.slice(0, 5).map((order) => (
            <div className="manager-order" key={order.id}><b>{order.number}</b><div><span>{order.table} · {order.items.length} items</span><small>{order.guest}</small></div><em className={`status-${order.status}`}>{order.status}</em></div>
          ))}
        </div>
        {role === "owner" && (
          <StaffPanel state={state} perform={perform} busy={busy} />
        )}
        <div className="panel audit-panel">
          <header>
            <div><p className="eyebrow">Accountability</p><h2>Operational audit timeline</h2></div>
            <span>{state.auditLog.length} events</span>
          </header>
          <div className="audit-list">
            {state.auditLog.slice(0, 10).map((event) => (
              <div key={event.id}>
                <span className={`audit-role role-${event.actorRole}`}>
                  {event.actorRole.slice(0, 1).toUpperCase()}
                </span>
                <p>
                  <b>{event.summary}</b>
                  <small>{event.actor} · {event.entityType} · {timeAgo(event.createdAt)} ago</small>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function StaffPanel({
  state,
  perform,
  busy,
}: {
  state: AppState;
  perform: (action: DemoAction) => Promise<ActionResponse | null>;
  busy: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "kitchen" as "kitchen" | "waiter" | "manager",
  });
  return (
    <div className="panel staff-panel">
      <header>
        <div><p className="eyebrow">Owner control</p><h2>Staff roster</h2></div>
        <span>{state.staff.filter((entry) => entry.status === "active").length} active</span>
      </header>
      <form
        className="staff-form"
        onSubmit={(event) => {
          event.preventDefault();
          void perform({ type: "add_staff", ...form }).then((result) => {
            if (result) setForm({ name: "", email: "", role: "kitchen" });
          });
        }}
      >
        <label>
          Name
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Team member"
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@example.com"
          />
        </label>
        <label>
          Role
          <select
            value={form.role}
            onChange={(event) =>
              setForm({
                ...form,
                role: event.target.value as typeof form.role,
              })
            }
          >
            <option value="kitchen">Kitchen</option>
            <option value="waiter">Waiter</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        <button className="button primary" disabled={busy}>Add invitation</button>
      </form>
      <div className="compact-list">
        {state.staff.map((staff) => (
          <div key={staff.id}>
            <span>
              <b>{staff.name}</b>
              <small>{staff.email} · {staff.role} · {staff.status}</small>
            </span>
            {staff.role !== "owner" && (
              <button
                disabled={busy}
                onClick={() =>
                  void perform({
                    type: "set_staff_status",
                    staffId: staff.id,
                    status: staff.status === "active" ? "inactive" : "active",
                  })
                }
              >
                {staff.status === "active" ? "Deactivate" : "Activate"}
              </button>
            )}
          </div>
        ))}
      </div>
      <small className="control-note">
        The roster controls operational access status. Supabase email verification remains the
        identity checkpoint before a staff membership becomes usable.
      </small>
    </div>
  );
}

function Metric({ label, value, change }: { label: string; value: string; change: string }) {
  return <article className="metric"><span>{label}</span><b>{value}</b><small>{change}</small></article>;
}
