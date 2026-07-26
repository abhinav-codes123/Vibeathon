# Five-minute judge demo

## 0:00–0:40 — The problem

Open `/`. “Restaurants usually split the guest, kitchen, floor, and stock room into separate systems. FlowDine models one living restaurant so an action anywhere changes the truth everywhere.”

Point to the live service card: tables, tickets, queue, and ingredient risk.

## 0:40–1:45 — Guest to kitchen

Open **Guest**. Filter or search the menu. Point out recipe-derived portions and allergen/preparation information. Add **Ember Paneer Tikka**, open the cart, enter a note, and place the order.

Explain that the server rechecks stock and records the movement before confirming.

## 1:45–2:35 — Kitchen

Switch to **Kitchen**. Locate the newest SC ticket. Show the age, promised time, notes, and allergens. Advance it to preparing.

Explain that invalid or duplicate transitions are rejected.

## 2:35–3:15 — Waiter

Switch to **Waiter**. Resolve one guest request or run a ready dish. Advance a table state and show the service priority queue.

## 3:15–4:25 — Manager

Switch to **Manager**. Show revenue rhythm, occupancy, ticket load, recipe-derived stock risks, forecast method, and the live order.

Ask: “What should I prioritize in the next 15 minutes?” State clearly whether the badge says **Gemini** or **Local engine**.

## 4:25–5:00 — Close

“The AI recommends; deterministic rules remain authoritative. The public demo persists in D1 with optimistic concurrency and audit events, and a normalized Supabase/RLS migration shows the scale-up path.”

Mention the honest boundaries: demo roles, simulated payments, polling realtime, and optional AI credentials.
