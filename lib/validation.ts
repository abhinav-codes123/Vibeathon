import type { DemoAction, DiningTable, StaffMember } from "./types";

export class ActionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionValidationError";
  }
}

type InputRecord = Record<string, unknown>;

function record(value: unknown): InputRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ActionValidationError("The action payload must be a JSON object.");
  }
  return value as InputRecord;
}

function text(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; pattern?: RegExp } = {},
) {
  if (typeof value !== "string") {
    throw new ActionValidationError(`${label} must be text.`);
  }
  const normalized = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 100;
  if (normalized.length < min || normalized.length > max) {
    throw new ActionValidationError(`${label} must be between ${min} and ${max} characters.`);
  }
  if (options.pattern && !options.pattern.test(normalized)) {
    throw new ActionValidationError(`${label} has an invalid format.`);
  }
  return normalized;
}

function optionalText(value: unknown, label: string, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return text(value, label, { min: 0, max });
}

function integer(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ActionValidationError(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function number(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ActionValidationError(`${label} must be between ${min} and ${max}.`);
  }
  return value;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new ActionValidationError(`${label} must be true or false.`);
  }
  return value;
}

function oneOf<T extends string>(value: unknown, label: string, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new ActionValidationError(`${label} is invalid.`);
  }
  return value as T;
}

const id = (value: unknown, label: string) => text(value, label, { max: 100 });
const tableCode = (value: unknown) =>
  text(value, "Table", { max: 16, pattern: /^[A-Za-z0-9-]+$/ });

export function validateDemoAction(input: unknown): DemoAction {
  const value = record(input);
  const type = text(value.type, "Action type", { max: 40 });

  if (type === "place_order") {
    if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) {
      throw new ActionValidationError("An order must contain between 1 and 20 item lines.");
    }
    return {
      type,
      guest: text(value.guest, "Guest name", { max: 100 }),
      table: tableCode(value.table),
      notes: optionalText(value.notes, "Order notes", 500),
      items: value.items.map((line, index) => {
        const item = record(line);
        return {
          menuItemId: id(item.menuItemId, `Item ${index + 1} identifier`),
          quantity: integer(item.quantity, `Item ${index + 1} quantity`, 1, 10),
        };
      }),
    };
  }

  if (type === "advance_order" || type === "cancel_order" || type === "mark_paid") {
    return { type, orderId: id(value.orderId, "Order identifier") };
  }
  if (type === "request_service") {
    return {
      type,
      table: tableCode(value.table),
      requestType: oneOf(value.requestType, "Service request type", [
        "assistance",
        "bill",
        "water",
      ] as const),
    };
  }
  if (type === "resolve_request") {
    return { type, requestId: id(value.requestId, "Service request identifier") };
  }
  if (type === "join_queue") {
    return {
      type,
      name: text(value.name, "Guest name", { max: 100 }),
      partySize: integer(value.partySize, "Party size", 1, 20),
    };
  }
  if (type === "leave_queue") {
    return {
      type,
      queueId: id(value.queueId, "Queue identifier"),
      managementToken: text(value.managementToken, "Queue management receipt", {
        min: 16,
        max: 200,
      }),
    };
  }
  if (type === "reserve") {
    const date = text(value.date, "Reservation date", {
      max: 10,
      pattern: /^\d{4}-\d{2}-\d{2}$/,
    });
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      throw new ActionValidationError("Reservation date cannot be in the past.");
    }
    return {
      type,
      name: text(value.name, "Guest name", { max: 100 }),
      phone: text(value.phone, "Phone number", {
        min: 7,
        max: 20,
        pattern: /^[+()\d\s-]+$/,
      }),
      partySize: integer(value.partySize, "Party size", 1, 20),
      date,
      time: text(value.time, "Reservation time", {
        max: 5,
        pattern: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
      }),
    };
  }
  if (type === "toggle_pause") {
    return { type, menuItemId: id(value.menuItemId, "Menu item identifier") };
  }
  if (type === "restock") {
    return {
      type,
      ingredientId: id(value.ingredientId, "Ingredient identifier"),
      quantity: number(value.quantity, "Restock quantity", 0.01, 1_000_000),
    };
  }
  if (type === "set_table") {
    return {
      type,
      tableId: id(value.tableId, "Table identifier"),
      status: oneOf<DiningTable["status"]>(value.status, "Table status", [
        "available",
        "reserved",
        "occupied",
        "bill_requested",
        "cleaning",
        "out_of_service",
      ]),
    };
  }
  if (type === "set_accepting_orders") {
    return {
      type,
      accepting: boolean(value.accepting, "Accepting orders"),
    };
  }
  if (type === "set_restaurant_open") {
    return {
      type,
      open: boolean(value.open, "Restaurant open"),
    };
  }
  if (type === "add_staff") {
    return {
      type,
      name: text(value.name, "Staff name", { min: 2, max: 100 }),
      email: text(value.email, "Staff email", {
        min: 5,
        max: 254,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      }).toLowerCase(),
      role: oneOf(value.role, "Staff role", ["kitchen", "waiter", "manager"] as const),
    };
  }
  if (type === "set_staff_status") {
    return {
      type,
      staffId: id(value.staffId, "Staff identifier"),
      status: oneOf<StaffMember["status"]>(value.status, "Staff status", [
        "active",
        "inactive",
        "invited",
      ]),
    };
  }
  if (type === "set_staff_role") {
    return {
      type,
      staffId: id(value.staffId, "Staff identifier"),
      role: oneOf(value.role, "Staff role", ["kitchen", "waiter", "manager"] as const),
    };
  }
  if (type === "set_reservation_status") {
    return {
      type,
      reservationId: id(value.reservationId, "Reservation identifier"),
      status: oneOf(value.status, "Reservation status", [
        "confirmed",
        "seated",
        "cancelled",
      ] as const),
    };
  }

  throw new ActionValidationError("Unsupported action.");
}
