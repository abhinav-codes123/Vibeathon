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
  splitEqually,
} from "../lib/domain.ts";
import { seedState } from "../lib/seed.ts";

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
  assert.equal(placed.inventory.find((item) => item.id === "paneer")!.quantity, before - 360);
  const cancelled = applyAction(placed, { type: "cancel_order", orderId: order.id }).state;
  assert.equal(cancelled.inventory.find((item) => item.id === "paneer")!.quantity, before);
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
});
