import type { AppState } from "./types";

export function publicStateProjection(input: AppState): AppState {
  const state = structuredClone(input);

  state.inventory = [];
  state.movements = [];
  state.serviceRequests = [];
  state.revenueHistory = [];
  state.hourlyDemand = [];
  state.orders = state.orders.map((order) => ({
    ...order,
    guest: "Guest",
    notes: "",
    allergens: [],
    items: [],
    total: 0,
  }));
  state.reservations = state.reservations.map((reservation) => ({
    ...reservation,
    name: "Guest",
    phone: "",
  }));
  state.queue = state.queue.map((entry, index) => ({
    ...entry,
    name: `Party ${index + 1}`,
  }));

  return state;
}
