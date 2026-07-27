# FlowDine AI — Vibeathon 6.0 presentation content

## Slide 1 — Title Page

**FlowDine AI**

Live Restaurant Digital Twin for Faster, Smarter Dining

- Team: `[TEAM NAME]`
- Team leader: `[TEAM LEADER]`
- College: `[COLLEGE]`
- Year and department: `[YEAR — DEPARTMENT]`
- Problem statement: Smart Restaurant Management System

## Slide 2 — Current Problem

**Restaurants run on disconnected data**

- Dishes change after guests choose
- Kitchen updates reach staff late
- Tables, queues, and bills are fragmented
- Stock and menu availability drift
- Managers spot bottlenecks too late

## Slide 3 — Proposed Solution

**One live operating system**

- One shared restaurant state
- Recipe-aware live availability
- Guest → kitchen → waiter flow
- Tables, queue, billing, and inventory
- Forecasting and operations copilot

Signature example: when ingredient stock supports only four servings, the menu shows “Only 4 left.” Accepted orders reduce stock and recalculate remaining portions automatically.

## Slide 4 — Technical Approach

**Production-shaped, deterministic core**

- Next.js 16 + React 19 + TypeScript
- Supabase Auth + membership roles
- D1 versioned state + audit trail
- Recipe, order, queue, and billing engine
- Gemini adapter + local fallback

Architecture: role-based interfaces call Next.js routes and deterministic domain services. Operational state is stored in Cloudflare D1 with optimistic concurrency. Supabase authentication code and membership authorization protect staff access. Gemini can enrich insights, while deterministic fallback signals keep the application usable without an external model.

## Slide 5 — Use Cases & Impact

**One clear next action for every role**

- Guest: know what is available
- Kitchen: safer, timed tickets
- Waiter: prioritized service
- Manager: live control
- Measures waits, delays, stockouts

The product can measure preparation time, delayed-order percentage, table turnover, stockout frequency, average order value, and queue waiting time. No unverified improvement percentage is claimed.

## Slide 6 — Future Scope & Conclusion

**From reactive to predictive operations**

- Verify production auth
- Tenant-isolated onboarding
- Payments, suppliers, notifications
- Predictive multi-location operations
- One intelligent restaurant operating system

Live demo: https://flowdine-ai.abhinavchaudhary484.chatgpt.site

FlowDine AI gives customers certainty, staff coordination, and managers real-time control through one intelligent restaurant operating system.
