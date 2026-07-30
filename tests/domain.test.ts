import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAction,
  availablePortions,
  billFor,
  can,
  estimatePreparation,
  forecastSummary,
  queueWaitEstimate,
  recommendations,
  serviceSummary,
  splitEqually,
} from "../lib/domain.ts";
import { seedState } from "../lib/seed.ts";
import { canAccessView, resolveActionRole } from "../lib/authz.ts";
import { publicStateProjection } from "../lib/state-projection.ts";
import { parseSupabaseAuthProviders } from "../lib/supabase/config.ts";
import { ActionValidationError, validateDemoAction } from "../lib/validation.ts";

const fresh = () => structuredClone(seedState);

test("availability is the limiting recipe ingredient", () => {
  const state = fresh();
  const prawn = state.menu.find((item) => item.id === "m4");
  assert.ok(prawn);
  assert.equal(availablePortions(prawn, state), 2);
  state.inventory.find((item) => item.id === "lime")!.quantity = 0;
  assert.equal(availablePortions(prawn, state), 0);
});

test("placing and cancelling an order reserves then restores stock", () => {
  const state = fresh();
  const before = state.inventory.find((item) => item.id === "paneer")!.quantity;
  const placed = applyAction(state, {
    type: "place_order",
    guest: "QA Guest",
    table: "T01",
    items: [{ menuItemId: "m1", quantity: 2 }],
  }).state;
  const order = placed.orders[0];
  assert.equal(order.status, "received");
  assert.equal(placed.inventory.find((item) => item.id === "paneer")!.quantity, before - 360);
  const cancelled = applyAction(placed, { type: "cancel_order", orderId: order.id }).state;
  assert.equal(cancelled.inventory.find((item) => item.id === "paneer")!.quantity, before);
});

test("cancelling after preparation starts does not restore consumed stock", () => {
  const state = fresh();
  const before = state.inventory.find((item) => item.id === "paneer")!.quantity;
  const placed = applyAction(state, {
    type: "place_order",
    guest: "QA Guest",
    table: "T01",
    items: [{ menuItemId: "m1", quantity: 1 }],
  }).state;
  const order = placed.orders[0];
  applyAction(placed, { type: "advance_order", orderId: order.id });
  applyAction(placed, { type: "advance_order", orderId: order.id });
  const afterPreparation = placed.inventory.find((item) => item.id === "paneer")!.quantity;
  applyAction(placed, { type: "cancel_order", orderId: order.id });
  assert.equal(afterPreparation, before - 180);
  assert.equal(placed.inventory.find((item) => item.id === "paneer")!.quantity, afterPreparation);
});

test("queue removal requires the private receipt returned at join time", () => {
  const state = fresh();
  const joined = applyAction(state, { type: "join_queue", name: "QA Party", partySize: 3 });
  assert.ok(joined.queueAccess);
  assert.throws(
    () =>
      applyAction(state, {
        type: "leave_queue",
        queueId: joined.queueAccess!.queueId,
        managementToken: "0000000000000000",
      }),
    /browser that created it/,
  );
  applyAction(state, { type: "leave_queue", ...joined.queueAccess });
  assert.equal(
    state.queue.find((entry) => entry.id === joined.queueAccess!.queueId)?.status,
    "left",
  );
});

test("preparation estimate is explainable and increases with workload", () => {
  const state = fresh();
  const loaded = estimatePreparation([{ menuItemId: "m5", quantity: 2 }], state);
  state.orders = [];
  const quiet = estimatePreparation([{ menuItemId: "m5", quantity: 2 }], state);
  assert.ok(loaded > quiet);
  assert.ok(quiet >= 26);
});

test("queue wait uses matching table availability and parties ahead", () => {
  const state = fresh();
  state.tables.forEach((table) => {
    table.status = "occupied";
    table.occupiedMinutes = 55;
  });
  assert.ok(queueWaitEstimate(4, state) >= 30);
  state.tables[1].status = "available";
  assert.equal(queueWaitEstimate(4, state), 5);
});

test("bill calculation and equal split preserve every paise", () => {
  const bill = billFor(10000, 5, 5);
  assert.deepEqual(bill, { subtotal: 10000, tax: 500, service: 500, total: 11000 });
  const shares = splitEqually(10001, 3);
  assert.equal(shares.reduce((sum, value) => sum + value, 0), 10001);
  assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
});

test("recommendations exclude unavailable and allergen-conflicting dishes", () => {
  const state = fresh();
  const rows = recommendations(state, ["shellfish", "dairy"]);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((item) => !item.allergens.includes("shellfish")));
  assert.ok(rows.every((item) => !item.allergens.includes("dairy")));
  assert.ok(rows.every((item) => availablePortions(item, state) > 0));
});

test("forecast uses a weighted moving average and exposes stock risks", () => {
  const forecast = forecastSummary(fresh());
  assert.ok(forecast.expectedOrders > 0);
  assert.equal(forecast.confidence, "High");
  assert.ok(forecast.risks.some((item) => item.id === "mushroom"));
});

test("role permissions enforce server-side operational boundaries", () => {
  assert.equal(can("customer", "restock"), false);
  assert.equal(can("kitchen", "advance_order"), true);
  assert.equal(can("waiter", "toggle_pause"), false);
  assert.equal(can("manager", "toggle_pause"), true);
  assert.equal(can("owner", "cancel_order"), true);
  assert.equal(can("customer", "mark_paid"), false);
  assert.equal(can("manager", "mark_paid"), true);
  assert.equal(can("manager", "add_staff"), false);
  assert.equal(can("owner", "add_staff"), true);
});

test("payment is lifecycle checked and moves the table to cleaning", () => {
  const state = fresh();
  const order = state.orders.find((entry) => entry.id === "order-102")!;
  assert.equal(order.status, "ready");
  assert.throws(
    () => applyAction(state, { type: "mark_paid", orderId: order.id }),
    /served order/,
  );
  applyAction(state, { type: "advance_order", orderId: order.id });
  applyAction(state, { type: "mark_paid", orderId: order.id });
  assert.equal(order.paid, true);
  assert.equal(order.status, "completed");
  assert.equal(state.tables.find((table) => table.code === order.table)?.status, "cleaning");
  assert.throws(
    () => applyAction(state, { type: "mark_paid", orderId: order.id }),
    /already paid/,
  );
});

test("order stage transitions cannot be performed by the wrong staff role", () => {
  const state = fresh();
  const confirmed = state.orders.find((entry) => entry.status === "confirmed")!;
  assert.throws(
    () => applyAction(state, { type: "advance_order", orderId: confirmed.id }, "waiter"),
    /waiter access/,
  );
  applyAction(state, { type: "advance_order", orderId: confirmed.id }, "kitchen");
  applyAction(state, { type: "advance_order", orderId: confirmed.id }, "kitchen");
  assert.equal(confirmed.status, "ready");
  assert.throws(
    () => applyAction(state, { type: "advance_order", orderId: confirmed.id }, "kitchen"),
    /kitchen access/,
  );
  applyAction(state, { type: "advance_order", orderId: confirmed.id }, "waiter");
  assert.equal(confirmed.status, "served");
  assert.throws(
    () => applyAction(state, { type: "advance_order", orderId: confirmed.id }, "manager"),
    /cannot be advanced/,
  );
});

test("table lifecycle rejects impossible direct transitions", () => {
  const state = fresh();
  const table = state.tables.find((entry) => entry.status === "available")!;
  assert.throws(
    () =>
      applyAction(state, {
        type: "set_table",
        tableId: table.id,
        status: "cleaning",
      }),
    /cannot move directly/,
  );
  applyAction(state, { type: "set_table", tableId: table.id, status: "occupied" });
  applyAction(state, { type: "set_table", tableId: table.id, status: "bill_requested" });
  applyAction(state, { type: "set_table", tableId: table.id, status: "cleaning" });
  applyAction(state, { type: "set_table", tableId: table.id, status: "available" });
  assert.equal(table.status, "available");
});

test("verified membership roles gate staff workspaces", () => {
  assert.equal(canAccessView(null, "kitchen"), false);
  assert.equal(canAccessView("customer", "manager"), false);
  assert.equal(canAccessView("kitchen", "kitchen"), true);
  assert.equal(canAccessView("waiter", "kitchen"), false);
  assert.equal(canAccessView("manager", "kitchen"), true);
  assert.equal(canAccessView("owner", "manager"), true);
});

test("public customer actions remain available without granting staff authority", () => {
  assert.equal(resolveActionRole(null, "place_order"), "customer");
  assert.equal(resolveActionRole(null, "restock"), null);
  assert.equal(resolveActionRole("waiter", "set_table"), "waiter");
  assert.equal(resolveActionRole("manager", "restock"), "manager");
});

test("public state projection removes operational and guest-sensitive fields", () => {
  const projected = publicStateProjection(fresh());
  assert.equal(projected.inventory.length, 0);
  assert.equal(projected.movements.length, 0);
  assert.equal(projected.serviceRequests.length, 0);
  assert.equal(projected.revenueHistory.length, 0);
  assert.ok(projected.orders.every((order) => order.guest === "Guest"));
  assert.ok(projected.orders.every((order) => order.notes === ""));
  assert.ok(projected.reservations.every((reservation) => reservation.phone === ""));
  assert.ok(projected.queue.every((entry) => entry.name.startsWith("Party ")));
  assert.ok(projected.queue.every((entry) => entry.managementToken === undefined));
  assert.equal(projected.staff.length, 0);
  assert.equal(projected.auditLog.length, 0);
});

test("runtime action validation rejects malformed and abusive payloads", () => {
  assert.throws(
    () =>
      validateDemoAction({
        type: "place_order",
        guest: "QA",
        table: "T01",
        items: [{ menuItemId: "m1", quantity: Number.NaN }],
      }),
    ActionValidationError,
  );
  assert.throws(
    () =>
      validateDemoAction({
        type: "leave_queue",
        queueId: "q1",
        managementToken: "short",
      }),
    /receipt/,
  );
  assert.throws(
    () =>
      validateDemoAction({
        type: "reserve",
        name: "QA",
        phone: "<script>",
        partySize: 2,
        date: "1999-01-01",
        time: "20:30",
      }),
    ActionValidationError,
  );
  assert.deepEqual(
    validateDemoAction({
      type: "restock",
      ingredientId: "paneer",
      quantity: 250,
    }),
    { type: "restock", ingredientId: "paneer", quantity: 250 },
  );
});

test("auth provider controls fail closed and reflect Supabase settings", () => {
  assert.deepEqual(parseSupabaseAuthProviders(null), {
    email: false,
    google: false,
  });
  assert.deepEqual(
    parseSupabaseAuthProviders({
      external: { email: true, google: false, github: true },
    }),
    { email: true, google: false },
  );
  assert.deepEqual(
    parseSupabaseAuthProviders({
      external: { email: true, google: true },
    }),
    { email: true, google: true },
  );
});

test("restaurant intake controls fail closed without interrupting active tickets", () => {
  const state = fresh();
  applyAction(
    state,
    { type: "set_accepting_orders", accepting: false },
    "manager",
    "manager@example.com",
  );
  assert.equal(state.restaurant.acceptingOrders, false);
  assert.throws(
    () =>
      applyAction(state, {
        type: "place_order",
        guest: "Late guest",
        table: "T01",
        items: [{ menuItemId: "m1", quantity: 1 }],
      }),
    /not accepting/,
  );
  assert.ok(state.orders.some((order) => order.status === "preparing"));
  assert.equal(state.auditLog[0].actor, "manager@example.com");
});

test("closing service is blocked until operational work is complete", () => {
  const state = fresh();
  assert.throws(
    () => applyAction(state, { type: "set_restaurant_open", open: false }, "owner"),
    /Close blocked/,
  );
  state.orders.forEach((order) => {
    order.status = "completed";
    order.paid = true;
  });
  state.serviceRequests.forEach((request) => {
    request.status = "resolved";
  });
  state.queue.forEach((entry) => {
    entry.status = "left";
  });
  state.tables.forEach((table) => {
    if (["occupied", "bill_requested"].includes(table.status)) {
      table.status = "available";
    }
  });
  applyAction(state, { type: "set_restaurant_open", open: false }, "owner");
  assert.equal(state.restaurant.isOpen, false);
  assert.equal(state.restaurant.acceptingOrders, false);
  assert.throws(
    () => applyAction(state, { type: "set_accepting_orders", accepting: true }, "manager"),
    /Open the restaurant/,
  );
});

test("owner manages staff invitations without allowing owner deactivation", () => {
  const state = fresh();
  const result = applyAction(
    state,
    {
      type: "add_staff",
      name: "New Chef",
      email: "CHEF@EXAMPLE.COM",
      role: "kitchen",
    },
    "owner",
  );
  const invited = result.state.staff.at(-1)!;
  assert.equal(invited.email, "chef@example.com");
  assert.equal(invited.status, "invited");
  applyAction(
    state,
    { type: "set_staff_status", staffId: invited.id, status: "active" },
    "owner",
  );
  assert.equal(invited.status, "active");
  assert.throws(
    () =>
      applyAction(
        state,
        { type: "set_staff_status", staffId: "staff-priya", status: "inactive" },
        "owner",
      ),
    /owner cannot be deactivated/,
  );
});

test("order timeline records every controlled handoff", () => {
  const state = fresh();
  const result = applyAction(state, {
    type: "place_order",
    guest: "Timeline Guest",
    table: "T01",
    items: [{ menuItemId: "m1", quantity: 1 }],
  });
  const order = result.state.orders[0];
  for (const role of ["kitchen", "kitchen", "kitchen", "waiter"] as const) {
    applyAction(state, { type: "advance_order", orderId: order.id }, role);
  }
  applyAction(state, { type: "mark_paid", orderId: order.id }, "manager");
  assert.deepEqual(
    order.timeline.map((entry) => entry.status),
    ["received", "confirmed", "preparing", "ready", "served", "completed"],
  );
  assert.ok(state.auditLog.filter((entry) => entry.entityId === order.id).length >= 6);
});

test("paying one of two table orders does not release the table", () => {
  const state = fresh();
  const first = state.orders.find((order) => order.id === "order-102")!;
  first.status = "served";
  const second = structuredClone(first);
  second.id = "order-same-table";
  second.number = "SC-999";
  second.status = "served";
  second.paid = false;
  state.orders.push(second);
  state.tables.find((table) => table.code === first.table)!.status = "occupied";
  applyAction(state, { type: "mark_paid", orderId: first.id }, "manager");
  assert.notEqual(
    state.tables.find((table) => table.code === first.table)?.status,
    "cleaning",
  );
});

test("service summary is deterministic and separates facts from recommendations", () => {
  const state = fresh();
  const summary = serviceSummary(state);
  assert.equal(summary.activeOrders, 3);
  assert.equal(summary.cancelledOrders, 0);
  assert.equal(summary.openServiceRequests, 2);
  assert.ok(summary.lowStockItems > 0);
  assert.equal(typeof summary.averagePreparationMinutes, "number");
});
