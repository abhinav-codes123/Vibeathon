import type {
  AppState,
  DemoAction,
  MenuItem,
  Order,
  OrderStatus,
  Role,
} from "./types";

export function availablePortions(item: MenuItem, state: AppState): number {
  if (item.paused || item.recipe.length === 0) return item.paused ? 0 : 99;
  return Math.max(
    0,
    Math.floor(
      Math.min(
        ...item.recipe.map((line) => {
          const stock = state.inventory.find((entry) => entry.id === line.ingredientId);
          return stock ? stock.quantity / line.quantity : 0;
        }),
      ),
    ),
  );
}

export function availabilityLabel(portions: number) {
  if (portions <= 0) return { tone: "danger", label: "Temporarily unavailable" };
  if (portions <= 5) return { tone: "warning", label: `Only ${portions} portions left` };
  return { tone: "success", label: "Available now" };
}

export function estimatePreparation(
  items: { menuItemId: string; quantity: number }[],
  state: AppState,
): number {
  const selected = items
    .map((line) => ({ ...line, item: state.menu.find((item) => item.id === line.menuItemId) }))
    .filter((line): line is typeof line & { item: MenuItem } => Boolean(line.item));
  const base = selected.length
    ? Math.max(...selected.map(({ item }) => item.basePrepMinutes))
    : 10;
  const complexity = selected.reduce(
    (sum, { item, quantity }) => sum + (item.complexity - 1) * 2 + Math.max(0, quantity - 1),
    0,
  );
  const active = state.orders.filter((order) =>
    ["received", "confirmed", "preparing"].includes(order.status),
  ).length;
  return Math.max(8, Math.round(base + complexity + active * 1.8));
}

export function billFor(subtotal: number, taxPercent: number, servicePercent: number) {
  const tax = Math.round(subtotal * taxPercent) / 100;
  const service = Math.round(subtotal * servicePercent) / 100;
  return { subtotal, tax, service, total: subtotal + tax + service };
}

export function splitEqually(total: number, people: number) {
  const safePeople = Math.max(1, Math.floor(people));
  const base = Math.floor(total / safePeople);
  const remainder = total - base * safePeople;
  return Array.from({ length: safePeople }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function queueWaitEstimate(partySize: number, state: AppState) {
  const matchingAvailable = state.tables.some(
    (table) => table.status === "available" && table.seats >= partySize,
  );
  if (matchingAvailable) return 5;
  const waitingAhead = state.queue.filter((entry) => entry.status === "waiting").length;
  const matchingOccupied = state.tables
    .filter((table) => table.status === "occupied" && table.seats >= partySize)
    .map((table) => Math.max(8, 72 - (table.occupiedMinutes ?? 30)));
  const turnover = matchingOccupied.length ? Math.min(...matchingOccupied) : 35;
  return Math.round(turnover + waitingAhead * 8);
}

export function can(role: Role, action: string) {
  const permissions: Record<Role, string[]> = {
    customer: ["place_order", "request_service", "join_queue", "leave_queue", "reserve", "mark_paid"],
    kitchen: ["advance_order"],
    waiter: ["advance_order", "resolve_request", "set_table", "place_order"],
    manager: ["advance_order", "resolve_request", "set_table", "toggle_pause", "restock", "cancel_order"],
    owner: ["advance_order", "resolve_request", "set_table", "toggle_pause", "restock", "cancel_order"],
  };
  return permissions[role].includes(action);
}

export function recommendations(state: AppState, avoidAllergens: string[] = []) {
  return state.menu
    .filter(
      (item) =>
        availablePortions(item, state) > 0 &&
        !item.allergens.some((allergen) => avoidAllergens.includes(allergen)),
    )
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.basePrepMinutes - b.basePrepMinutes)
    .slice(0, 4);
}

export function forecastSummary(state: AppState) {
  const weighted = state.revenueHistory.slice(-4).reduce(
    (acc, day, index, rows) => {
      const weight = index + 1;
      return { orders: acc.orders + day.orders * weight, weight: acc.weight + weight, rows: rows.length };
    },
    { orders: 0, weight: 0, rows: 0 },
  );
  const expectedOrders = Math.round(weighted.orders / Math.max(1, weighted.weight));
  const risks = state.inventory
    .filter((item) => item.quantity / item.par < 0.35)
    .sort((a, b) => a.quantity / a.par - b.quantity / b.par);
  return {
    expectedOrders,
    confidence: state.revenueHistory.length >= 7 ? "High" : "Medium",
    risks,
  };
}

export function insightCards(state: AppState) {
  const active = state.orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const delayed = active.filter(
    (order) => Date.now() - new Date(order.createdAt).getTime() > order.estimateMinutes * 60_000,
  );
  const limited = state.menu.filter((item) => {
    const portions = availablePortions(item, state);
    return portions > 0 && portions <= 5;
  });
  const unavailable = state.menu.filter((item) => availablePortions(item, state) === 0);
  return [
    {
      level: delayed.length ? "urgent" : "good",
      title: delayed.length ? `${delayed.length} ticket needs attention` : "Kitchen flow is on track",
      body: delayed.length
        ? `${delayed.map((order) => order.number).join(", ")} exceeded the promised window. Prioritize the oldest ticket.`
        : "No active ticket has crossed its explainable preparation estimate.",
    },
    {
      level: limited.length || unavailable.length ? "watch" : "good",
      title: `${limited.length + unavailable.length} availability risks`,
      body: unavailable.length
        ? `${unavailable.slice(0, 2).map((item) => item.name).join(" and ")} cannot be produced from current usable stock.`
        : "All dishes are currently supported by recipe-linked inventory.",
    },
    {
      level: "opportunity",
      title: "Promote fast, contribution-friendly dishes",
      body: `${recommendations(state).slice(0, 2).map((item) => item.name).join(" and ")} are available, popular, and keep kitchen load controlled.`,
    },
  ];
}

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
};

export function applyAction(state: AppState, action: DemoAction): { state: AppState; message: string } {
  const now = new Date().toISOString();
  if (action.type === "place_order") {
    if (!action.items.length) throw new Error("Add at least one item before ordering.");
    const lines = action.items.map((line) => {
      const item = state.menu.find((entry) => entry.id === line.menuItemId);
      if (!item || line.quantity < 1) throw new Error("One or more order items are invalid.");
      if (availablePortions(item, state) < line.quantity) {
        throw new Error(`${item.name} just became unavailable. Your cart was not charged.`);
      }
      return { item, quantity: Math.min(10, Math.floor(line.quantity)) };
    });
    for (const { item, quantity } of lines) {
      for (const recipe of item.recipe) {
        const stock = state.inventory.find((entry) => entry.id === recipe.ingredientId);
        if (!stock) throw new Error("Recipe inventory is incomplete.");
        const delta = recipe.quantity * quantity;
        if (stock.quantity < delta) throw new Error(`${item.name} is no longer available.`);
        stock.quantity -= delta;
        state.movements.unshift({
          id: crypto.randomUUID(),
          ingredientId: stock.id,
          delta: -delta,
          reason: `Reserved for dine-in order at ${action.table}`,
          createdAt: now,
        });
      }
    }
    const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
    const totals = billFor(
      subtotal,
      state.restaurant.taxPercent,
      state.restaurant.serviceChargePercent,
    );
    const nextOrderNumber =
      Math.max(
        100,
        ...state.orders.map((entry) => Number(entry.number.replace(/\D/g, "")) || 100),
      ) + 1;
    const order: Order = {
      id: crypto.randomUUID(),
      number: `SC-${String(nextOrderNumber).padStart(3, "0")}`,
      table: action.table,
      guest: action.guest.trim() || "Guest",
      status: "confirmed",
      items: lines.map(({ item, quantity }) => ({
        menuItemId: item.id,
        name: item.name,
        quantity,
        unitPrice: item.price,
      })),
      notes: action.notes?.trim() ?? "",
      allergens: Array.from(new Set(lines.flatMap(({ item }) => item.allergens))),
      createdAt: now,
      updatedAt: now,
      estimateMinutes: estimatePreparation(action.items, state),
      total: totals.total,
      paid: false,
    };
    state.orders.unshift(order);
    const table = state.tables.find((entry) => entry.code === action.table);
    if (table) table.status = "occupied";
    state.updatedAt = now;
    return { state, message: `${order.number} confirmed. The kitchen has your ticket.` };
  }

  if (action.type === "advance_order") {
    const order = state.orders.find((entry) => entry.id === action.orderId);
    if (!order) throw new Error("Order not found.");
    const status = nextStatus[order.status];
    if (!status) throw new Error("This order cannot be advanced again.");
    order.status = status;
    order.updatedAt = now;
    state.updatedAt = now;
    return { state, message: `${order.number} moved to ${status}.` };
  }

  if (action.type === "cancel_order") {
    const order = state.orders.find((entry) => entry.id === action.orderId);
    if (!order || ["completed", "cancelled"].includes(order.status)) {
      throw new Error("This order cannot be cancelled.");
    }
    for (const line of order.items) {
      const item = state.menu.find((entry) => entry.id === line.menuItemId);
      for (const recipe of item?.recipe ?? []) {
        const stock = state.inventory.find((entry) => entry.id === recipe.ingredientId);
        if (stock) {
          const delta = recipe.quantity * line.quantity;
          stock.quantity += delta;
          state.movements.unshift({
            id: crypto.randomUUID(),
            ingredientId: stock.id,
            delta,
            reason: `Restored from cancelled ${order.number}`,
            createdAt: now,
          });
        }
      }
    }
    order.status = "cancelled";
    order.updatedAt = now;
    state.updatedAt = now;
    return { state, message: `${order.number} cancelled and reserved ingredients restored.` };
  }

  if (action.type === "request_service") {
    state.serviceRequests.unshift({
      id: crypto.randomUUID(),
      table: action.table,
      type: action.requestType,
      status: "open",
      createdAt: now,
    });
    const table = state.tables.find((entry) => entry.code === action.table);
    if (table && action.requestType === "bill") table.status = "bill_requested";
    state.updatedAt = now;
    return { state, message: action.requestType === "bill" ? "Bill requested." : "A waiter has been notified." };
  }

  if (action.type === "resolve_request") {
    const request = state.serviceRequests.find((entry) => entry.id === action.requestId);
    if (!request) throw new Error("Service request not found.");
    request.status = "resolved";
    state.updatedAt = now;
    return { state, message: "Service request resolved." };
  }

  if (action.type === "join_queue") {
    const estimateMinutes = queueWaitEstimate(action.partySize, state);
    state.queue.push({
      id: crypto.randomUUID(),
      name: action.name.trim() || "Guest",
      partySize: Math.max(1, Math.min(20, Math.floor(action.partySize))),
      status: "waiting",
      joinedAt: now,
      estimateMinutes,
    });
    state.updatedAt = now;
    return { state, message: `You joined the queue. Estimated wait: ${estimateMinutes} minutes.` };
  }

  if (action.type === "leave_queue") {
    const entry = state.queue.find((row) => row.id === action.queueId);
    if (!entry) throw new Error("Queue entry not found.");
    entry.status = "left";
    state.updatedAt = now;
    return { state, message: "You left the live queue." };
  }

  if (action.type === "reserve") {
    if (action.partySize < 1 || action.partySize > 20) throw new Error("Party size must be between 1 and 20.");
    state.reservations.push({
      id: crypto.randomUUID(),
      name: action.name.trim() || "Guest",
      phone: action.phone.trim(),
      partySize: Math.floor(action.partySize),
      date: action.date,
      time: action.time,
      status: "confirmed",
    });
    state.updatedAt = now;
    return { state, message: `Reservation confirmed for ${action.time}.` };
  }

  if (action.type === "toggle_pause") {
    const item = state.menu.find((entry) => entry.id === action.menuItemId);
    if (!item) throw new Error("Menu item not found.");
    item.paused = !item.paused;
    state.updatedAt = now;
    return { state, message: `${item.name} is now ${item.paused ? "paused" : "live"}.` };
  }

  if (action.type === "restock") {
    const item = state.inventory.find((entry) => entry.id === action.ingredientId);
    if (!item || action.quantity <= 0) throw new Error("Enter a valid restock quantity.");
    item.quantity += action.quantity;
    state.movements.unshift({
      id: crypto.randomUUID(),
      ingredientId: item.id,
      delta: action.quantity,
      reason: "Manager restock",
      createdAt: now,
    });
    state.updatedAt = now;
    return { state, message: `${item.name} stock updated.` };
  }

  if (action.type === "set_table") {
    const table = state.tables.find((entry) => entry.id === action.tableId);
    if (!table) throw new Error("Table not found.");
    table.status = action.status;
    state.updatedAt = now;
    return { state, message: `${table.code} marked ${action.status.replaceAll("_", " ")}.` };
  }

  if (action.type === "mark_paid") {
    const order = state.orders.find((entry) => entry.id === action.orderId);
    if (!order) throw new Error("Order not found.");
    order.paid = true;
    state.updatedAt = now;
    return { state, message: "Simulated payment completed and receipt preserved." };
  }

  throw new Error("Unsupported action.");
}
