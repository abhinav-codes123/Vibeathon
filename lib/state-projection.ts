import type { AppState } from "./types";

export function publicStateProjection(input: AppState): AppState {
  const state = structuredClone(input);

  state.inventory = [];
  state.movements = [];
  state.serviceRequests = [];
  state.revenueHistory = [];
  state.hourlyDemand = [];
  state.staff = [];
  state.auditLog = [];
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
  state.queue = state.queue.map((entry, index) => {
    const publicEntry = { ...entry };
    delete publicEntry.managementToken;
    return {
      ...publicEntry,
      name: `Party ${index + 1}`,
    };
  });

  return state;
}
