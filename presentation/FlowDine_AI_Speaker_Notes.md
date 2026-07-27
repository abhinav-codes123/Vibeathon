# FlowDine AI — speaker notes

## Slide 1 — Title Page (15–20 seconds)

FlowDine AI is a Live Restaurant Digital Twin. It is not another food-delivery clone; it is the operating layer inside the restaurant. It connects the guest, kitchen, waiter, manager, tables, orders, recipes, and ingredients so every role acts from one current restaurant state.

## Slide 2 — Current Problem (35–40 seconds)

The root problem is not a lack of software. It is that restaurant information arrives late and lives in separate places. A guest can choose a dish after its key ingredient is already low. The kitchen may know a ticket is delayed while the waiter and customer do not. Tables, queues, bills, and stock are updated through separate tools or verbal communication. The result is modified orders, waiting, staff confusion, and managers reacting after the bottleneck has already affected service.

## Slide 3 — Proposed Solution (45–55 seconds)

FlowDine AI creates one shared operating state for the entire restaurant. A guest sees live dish availability, places an order, and tracks progress. The kitchen receives a ticket with notes and allergens. When the order is accepted, the recipe engine reduces ingredient stock and recalculates available portions. The waiter receives the next service action, billing is generated, and the manager sees the same event in the command center. That is our differentiator: the menu is not manually toggled. If stock supports four servings, guests see “Only 4 left,” and every accepted order updates that number automatically.

## Slide 4 — Technical Approach (35–45 seconds)

The interface and API layer use Next.js 16, React 19, and TypeScript. Staff access is protected through Supabase authentication code and membership-based role checks. The deterministic domain engine owns ordering, recipe consumption, queues, reservations, billing, and availability. Shared operational state is stored in Cloudflare D1 with optimistic version checks and an audit trail. Gemini can enrich management insights, but a local fallback keeps the demo functional and keeps deterministic operational signals authoritative.

## Slide 5 — Use Cases & Impact (35–45 seconds)

Each role gets one useful next action. Guests know what can actually be ordered. Kitchen teams see ticket age, special instructions, and allergens. Waiters see ready dishes and prioritized service requests. Managers see orders, tables, inventory risk, forecasts, and operational attention points together. We are not claiming invented percentage improvements. The system is designed to reduce unavailable-item surprises and coordination delay, and it can measure preparation time, delayed orders, table turnover, stockouts, order value, and queue waiting time.

## Slide 6 — Future Scope & Conclusion (25–35 seconds)

The current live demo proves the connected single-restaurant workflow. The next production steps are verifying external authentication providers, isolating operational data per restaurant, and adding payments, supplier workflows, and notifications. From there, the same model can support multiple branches and predictive operations. FlowDine AI gives customers certainty, staff coordination, and managers real-time control through one intelligent restaurant operating system. Thank you — we are ready to show the live demo.

