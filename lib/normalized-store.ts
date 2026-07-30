import { seedState } from "./seed";
import type {
  AppState,
  AuditEvent,
  DiningTable,
  InventoryItem,
  InventoryMovement,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderTimelineEvent,
  QueueEntry,
  Reservation,
  Role,
  ServiceRequest,
  StaffMember,
} from "./types";

export type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
};

export type D1DatabaseLike = {
  prepare(query: string): D1StatementLike;
  batch(
    statements: D1StatementLike[],
  ): Promise<Array<{ meta: { changes?: number }; results?: unknown[] }>>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS restaurant_operations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, tagline TEXT NOT NULL,
    location TEXT NOT NULL, service_charge_percent REAL NOT NULL,
    tax_percent REAL NOT NULL, default_turnover_minutes INTEGER NOT NULL,
    is_open INTEGER NOT NULL, accepting_orders INTEGER NOT NULL,
    last_opened_at TEXT NOT NULL, last_closed_at TEXT,
    version INTEGER NOT NULL DEFAULT 1, write_token TEXT, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL,
    unit TEXT NOT NULL, quantity REAL NOT NULL, par REAL NOT NULL,
    cost_per_unit REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL,
    category TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL,
    base_prep_minutes INTEGER NOT NULL, complexity INTEGER NOT NULL,
    dietary_json TEXT NOT NULL, allergens_json TEXT NOT NULL, spice TEXT NOT NULL,
    calories INTEGER NOT NULL, image TEXT NOT NULL, featured INTEGER NOT NULL,
    paused INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS recipe_lines (
    menu_item_id TEXT NOT NULL, ingredient_id TEXT NOT NULL, quantity REAL NOT NULL,
    UNIQUE(menu_item_id, ingredient_id)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, number TEXT NOT NULL,
    table_code TEXT NOT NULL, guest TEXT NOT NULL, customer_id TEXT, status TEXT NOT NULL,
    notes TEXT NOT NULL, allergens_json TEXT NOT NULL, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, estimate_minutes INTEGER NOT NULL,
    total INTEGER NOT NULL, paid INTEGER NOT NULL,
    UNIQUE(restaurant_id, number)
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, menu_item_id TEXT NOT NULL,
    name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_timeline (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, status TEXT NOT NULL,
    actor TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dining_tables (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, code TEXT NOT NULL,
    seats INTEGER NOT NULL, status TEXT NOT NULL, occupied_minutes INTEGER,
    UNIQUE(restaurant_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS queue_entries (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL,
    party_size INTEGER NOT NULL, status TEXT NOT NULL, joined_at TEXT NOT NULL,
    estimate_minutes INTEGER NOT NULL, management_token TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL,
    phone TEXT NOT NULL, party_size INTEGER NOT NULL, date TEXT NOT NULL,
    time TEXT NOT NULL, status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_requests (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, table_code TEXT NOT NULL,
    type TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, ingredient_id TEXT NOT NULL,
    delta REAL NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS staff_members (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL,
    email TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL, UNIQUE(restaurant_id, email)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, actor TEXT NOT NULL,
    actor_role TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
];

type RestaurantRow = {
  id: string;
  name: string;
  tagline: string;
  location: string;
  service_charge_percent: number;
  tax_percent: number;
  default_turnover_minutes: number;
  is_open: number;
  accepting_orders: number;
  last_opened_at: string;
  last_closed_at: string | null;
  version: number;
  updated_at: string;
};

const jsonArray = <T>(value: string): T[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export function upgradeState(input: AppState): AppState {
  const state = structuredClone(input);
  state.restaurant.defaultTurnoverMinutes ??= 75;
  state.restaurant.isOpen ??= true;
  state.restaurant.acceptingOrders ??= true;
  state.restaurant.lastOpenedAt ??= state.updatedAt;
  state.staff ??= structuredClone(seedState.staff);
  state.auditLog ??= [];
  state.orders = state.orders.map((order) => ({
    ...order,
    timeline:
      order.timeline?.length
        ? order.timeline
        : [
            {
              id: crypto.randomUUID(),
              status: order.status,
              actor: "Legacy import",
              createdAt: order.updatedAt || order.createdAt,
            },
          ],
  }));
  return state;
}

export async function ensureNormalizedSchema(database: D1DatabaseLike) {
  await database.batch(schemaStatements.map((sql) => database.prepare(sql)));
  const row = await database
    .prepare("SELECT id FROM restaurant_operations WHERE id = ?")
    .bind(seedState.restaurant.id)
    .first();
  if (row) return;

  let initial = structuredClone(seedState);
  try {
    const legacy = await database
      .prepare("SELECT payload FROM app_state WHERE restaurant_id = ?")
      .bind(seedState.restaurant.id)
      .first<{ payload: string }>();
    if (legacy?.payload) initial = upgradeState(JSON.parse(legacy.payload) as AppState);
  } catch {
    // A fresh installation has no legacy snapshot table.
  }

  await database
    .prepare(
      `INSERT INTO restaurant_operations (
        id, name, tagline, location, service_charge_percent, tax_percent,
        default_turnover_minutes, is_open, accepting_orders, last_opened_at,
        last_closed_at, version, write_token, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?)`,
    )
    .bind(
      initial.restaurant.id,
      initial.restaurant.name,
      initial.restaurant.tagline,
      initial.restaurant.location,
      initial.restaurant.serviceChargePercent,
      initial.restaurant.taxPercent,
      initial.restaurant.defaultTurnoverMinutes,
      Number(initial.restaurant.isOpen),
      Number(initial.restaurant.acceptingOrders),
      initial.restaurant.lastOpenedAt,
      initial.restaurant.lastClosedAt ?? null,
      initial.updatedAt,
    )
    .run();
  const written = await writeNormalizedState(database, initial, 1);
  if (!written) throw new Error("Unable to initialize restaurant operations.");
}

async function all<T>(database: D1DatabaseLike, query: string, restaurantId: string) {
  return (
    await database.prepare(query).bind(restaurantId).all<T>()
  ).results;
}

export async function readNormalizedState(
  database: D1DatabaseLike,
): Promise<{ state: AppState; version: number }> {
  const restaurant = await database
    .prepare("SELECT * FROM restaurant_operations WHERE id = ?")
    .bind(seedState.restaurant.id)
    .first<RestaurantRow>();
  if (!restaurant) throw new Error("Restaurant operations are unavailable.");

  const restaurantId = restaurant.id;
  const [
    inventoryRows,
    menuRows,
    recipeRows,
    orderRows,
    orderItemRows,
    timelineRows,
    tableRows,
    queueRows,
    reservationRows,
    requestRows,
    movementRows,
    staffRows,
    auditRows,
  ] = await Promise.all([
    all<Record<string, unknown>>(database, "SELECT * FROM inventory_items WHERE restaurant_id = ? ORDER BY name", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM recipe_lines WHERE menu_item_id IN (SELECT id FROM menu_items WHERE restaurant_id = ?)", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?)", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM order_timeline WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?) ORDER BY created_at", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM dining_tables WHERE restaurant_id = ? ORDER BY code", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM queue_entries WHERE restaurant_id = ? ORDER BY joined_at", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM reservations WHERE restaurant_id = ? ORDER BY date, time", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM service_requests WHERE restaurant_id = ? ORDER BY created_at DESC", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM inventory_movements WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 500", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM staff_members WHERE restaurant_id = ? ORDER BY created_at", restaurantId),
    all<Record<string, unknown>>(database, "SELECT * FROM audit_events WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 250", restaurantId),
  ]);

  const recipes = new Map<string, MenuItem["recipe"]>();
  for (const row of recipeRows) {
    const key = String(row.menu_item_id);
    const lines = recipes.get(key) ?? [];
    lines.push({
      ingredientId: String(row.ingredient_id),
      quantity: Number(row.quantity),
    });
    recipes.set(key, lines);
  }

  const items = new Map<string, OrderItem[]>();
  for (const row of orderItemRows) {
    const key = String(row.order_id);
    const lines = items.get(key) ?? [];
    lines.push({
      menuItemId: String(row.menu_item_id),
      name: String(row.name),
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
    });
    items.set(key, lines);
  }

  const timelines = new Map<string, OrderTimelineEvent[]>();
  for (const row of timelineRows) {
    const key = String(row.order_id);
    const events = timelines.get(key) ?? [];
    events.push({
      id: String(row.id),
      status: String(row.status) as OrderStatus,
      actor: String(row.actor),
      createdAt: String(row.created_at),
    });
    timelines.set(key, events);
  }

  const state: AppState = {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      tagline: restaurant.tagline,
      location: restaurant.location,
      serviceChargePercent: restaurant.service_charge_percent,
      taxPercent: restaurant.tax_percent,
      defaultTurnoverMinutes: restaurant.default_turnover_minutes,
      isOpen: Boolean(restaurant.is_open),
      acceptingOrders: Boolean(restaurant.accepting_orders),
      lastOpenedAt: restaurant.last_opened_at,
      ...(restaurant.last_closed_at ? { lastClosedAt: restaurant.last_closed_at } : {}),
    },
    inventory: inventoryRows.map(
      (row): InventoryItem => ({
        id: String(row.id),
        name: String(row.name),
        unit: String(row.unit),
        quantity: Number(row.quantity),
        par: Number(row.par),
        costPerUnit: Number(row.cost_per_unit),
      }),
    ),
    menu: menuRows.map(
      (row): MenuItem => ({
        id: String(row.id),
        name: String(row.name),
        category: String(row.category),
        description: String(row.description),
        price: Number(row.price),
        basePrepMinutes: Number(row.base_prep_minutes),
        complexity: Number(row.complexity) as 1 | 2 | 3,
        dietary: jsonArray<MenuItem["dietary"][number]>(String(row.dietary_json)),
        allergens: jsonArray<string>(String(row.allergens_json)),
        spice: String(row.spice) as MenuItem["spice"],
        calories: Number(row.calories),
        image: String(row.image),
        featured: Boolean(row.featured),
        paused: Boolean(row.paused),
        recipe: recipes.get(String(row.id)) ?? [],
      }),
    ),
    orders: orderRows.map(
      (row): Order => ({
        id: String(row.id),
        number: String(row.number),
        table: String(row.table_code),
        guest: String(row.guest),
        ...(row.customer_id ? { customerId: String(row.customer_id) } : {}),
        status: String(row.status) as OrderStatus,
        items: items.get(String(row.id)) ?? [],
        notes: String(row.notes),
        allergens: jsonArray<string>(String(row.allergens_json)),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        estimateMinutes: Number(row.estimate_minutes),
        total: Number(row.total),
        paid: Boolean(row.paid),
        timeline: timelines.get(String(row.id)) ?? [],
      }),
    ),
    tables: tableRows.map(
      (row): DiningTable => ({
        id: String(row.id),
        code: String(row.code),
        seats: Number(row.seats),
        status: String(row.status) as DiningTable["status"],
        ...(row.occupied_minutes === null || row.occupied_minutes === undefined
          ? {}
          : { occupiedMinutes: Number(row.occupied_minutes) }),
      }),
    ),
    queue: queueRows.map(
      (row): QueueEntry => ({
        id: String(row.id),
        name: String(row.name),
        partySize: Number(row.party_size),
        status: String(row.status) as QueueEntry["status"],
        joinedAt: String(row.joined_at),
        estimateMinutes: Number(row.estimate_minutes),
        ...(row.management_token ? { managementToken: String(row.management_token) } : {}),
      }),
    ),
    reservations: reservationRows.map(
      (row): Reservation => ({
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone),
        partySize: Number(row.party_size),
        date: String(row.date),
        time: String(row.time),
        status: String(row.status) as Reservation["status"],
      }),
    ),
    serviceRequests: requestRows.map(
      (row): ServiceRequest => ({
        id: String(row.id),
        table: String(row.table_code),
        type: String(row.type) as ServiceRequest["type"],
        status: String(row.status) as ServiceRequest["status"],
        createdAt: String(row.created_at),
      }),
    ),
    movements: movementRows.map(
      (row): InventoryMovement => ({
        id: String(row.id),
        ingredientId: String(row.ingredient_id),
        delta: Number(row.delta),
        reason: String(row.reason),
        createdAt: String(row.created_at),
      }),
    ),
    revenueHistory: structuredClone(seedState.revenueHistory),
    hourlyDemand: structuredClone(seedState.hourlyDemand),
    feedback: structuredClone(seedState.feedback),
    staff: staffRows.map(
      (row): StaffMember => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        role: String(row.role) as StaffMember["role"],
        status: String(row.status) as StaffMember["status"],
        createdAt: String(row.created_at),
      }),
    ),
    auditLog: auditRows.map(
      (row): AuditEvent => ({
        id: String(row.id),
        actor: String(row.actor),
        actorRole: String(row.actor_role) as Role,
        action: String(row.action),
        entityType: String(row.entity_type) as AuditEvent["entityType"],
        entityId: String(row.entity_id),
        summary: String(row.summary),
        createdAt: String(row.created_at),
      }),
    ),
    updatedAt: restaurant.updated_at,
  };
  return { state: upgradeState(state), version: restaurant.version };
}

function guardedInsert(
  database: D1DatabaseLike,
  table: string,
  columns: string[],
  values: unknown[],
  token: string,
) {
  const placeholders = values.map(() => "?").join(", ");
  return database
    .prepare(
      `INSERT INTO ${table} (${columns.join(", ")})
       SELECT ${placeholders}
       WHERE EXISTS (
         SELECT 1 FROM restaurant_operations WHERE id = ? AND write_token = ?
       )`,
    )
    .bind(...values, seedState.restaurant.id, token);
}

export async function writeNormalizedState(
  database: D1DatabaseLike,
  stateInput: AppState,
  expectedVersion: number,
) {
  const state = upgradeState(stateInput);
  const restaurantId = state.restaurant.id;
  const token = crypto.randomUUID();
  const guard = "EXISTS (SELECT 1 FROM restaurant_operations WHERE id = ? AND write_token = ?)";
  const statements: D1StatementLike[] = [
    database
      .prepare(
        `UPDATE restaurant_operations SET
          name = ?, tagline = ?, location = ?, service_charge_percent = ?,
          tax_percent = ?, default_turnover_minutes = ?, is_open = ?,
          accepting_orders = ?, last_opened_at = ?, last_closed_at = ?,
          version = version + 1, write_token = ?, updated_at = ?
         WHERE id = ? AND version = ?`,
      )
      .bind(
        state.restaurant.name,
        state.restaurant.tagline,
        state.restaurant.location,
        state.restaurant.serviceChargePercent,
        state.restaurant.taxPercent,
        state.restaurant.defaultTurnoverMinutes,
        Number(state.restaurant.isOpen),
        Number(state.restaurant.acceptingOrders),
        state.restaurant.lastOpenedAt,
        state.restaurant.lastClosedAt ?? null,
        token,
        state.updatedAt,
        restaurantId,
        expectedVersion,
      ),
  ];

  for (const sql of [
    `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?) AND ${guard}`,
    `DELETE FROM order_timeline WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = ?) AND ${guard}`,
    `DELETE FROM recipe_lines WHERE menu_item_id IN (SELECT id FROM menu_items WHERE restaurant_id = ?) AND ${guard}`,
    `DELETE FROM inventory_items WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM menu_items WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM orders WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM dining_tables WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM queue_entries WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM reservations WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM service_requests WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM inventory_movements WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM staff_members WHERE restaurant_id = ? AND ${guard}`,
    `DELETE FROM audit_events WHERE restaurant_id = ? AND ${guard}`,
  ]) {
    statements.push(database.prepare(sql).bind(restaurantId, restaurantId, token));
  }

  for (const item of state.inventory) {
    statements.push(
      guardedInsert(
        database,
        "inventory_items",
        ["id", "restaurant_id", "name", "unit", "quantity", "par", "cost_per_unit"],
        [item.id, restaurantId, item.name, item.unit, item.quantity, item.par, item.costPerUnit],
        token,
      ),
    );
  }
  for (const item of state.menu) {
    statements.push(
      guardedInsert(
        database,
        "menu_items",
        [
          "id",
          "restaurant_id",
          "name",
          "category",
          "description",
          "price",
          "base_prep_minutes",
          "complexity",
          "dietary_json",
          "allergens_json",
          "spice",
          "calories",
          "image",
          "featured",
          "paused",
        ],
        [
          item.id,
          restaurantId,
          item.name,
          item.category,
          item.description,
          item.price,
          item.basePrepMinutes,
          item.complexity,
          JSON.stringify(item.dietary),
          JSON.stringify(item.allergens),
          item.spice,
          item.calories,
          item.image,
          Number(Boolean(item.featured)),
          Number(Boolean(item.paused)),
        ],
        token,
      ),
    );
    for (const recipe of item.recipe) {
      statements.push(
        guardedInsert(
          database,
          "recipe_lines",
          ["menu_item_id", "ingredient_id", "quantity"],
          [item.id, recipe.ingredientId, recipe.quantity],
          token,
        ),
      );
    }
  }
  for (const order of state.orders) {
    statements.push(
      guardedInsert(
        database,
        "orders",
        [
          "id",
          "restaurant_id",
          "number",
          "table_code",
          "guest",
          "customer_id",
          "status",
          "notes",
          "allergens_json",
          "created_at",
          "updated_at",
          "estimate_minutes",
          "total",
          "paid",
        ],
        [
          order.id,
          restaurantId,
          order.number,
          order.table,
          order.guest,
          order.customerId ?? null,
          order.status,
          order.notes,
          JSON.stringify(order.allergens),
          order.createdAt,
          order.updatedAt,
          order.estimateMinutes,
          order.total,
          Number(order.paid),
        ],
        token,
      ),
    );
    order.items.forEach((item, index) => {
      statements.push(
        guardedInsert(
          database,
          "order_items",
          ["id", "order_id", "menu_item_id", "name", "quantity", "unit_price"],
          [`${order.id}:item:${index}`, order.id, item.menuItemId, item.name, item.quantity, item.unitPrice],
          token,
        ),
      );
    });
    for (const event of order.timeline) {
      statements.push(
        guardedInsert(
          database,
          "order_timeline",
          ["id", "order_id", "status", "actor", "created_at"],
          [event.id, order.id, event.status, event.actor, event.createdAt],
          token,
        ),
      );
    }
  }
  for (const table of state.tables) {
    statements.push(
      guardedInsert(
        database,
        "dining_tables",
        ["id", "restaurant_id", "code", "seats", "status", "occupied_minutes"],
        [table.id, restaurantId, table.code, table.seats, table.status, table.occupiedMinutes ?? null],
        token,
      ),
    );
  }
  for (const entry of state.queue) {
    statements.push(
      guardedInsert(
        database,
        "queue_entries",
        ["id", "restaurant_id", "name", "party_size", "status", "joined_at", "estimate_minutes", "management_token"],
        [entry.id, restaurantId, entry.name, entry.partySize, entry.status, entry.joinedAt, entry.estimateMinutes, entry.managementToken ?? null],
        token,
      ),
    );
  }
  for (const reservation of state.reservations) {
    statements.push(
      guardedInsert(
        database,
        "reservations",
        ["id", "restaurant_id", "name", "phone", "party_size", "date", "time", "status"],
        [reservation.id, restaurantId, reservation.name, reservation.phone, reservation.partySize, reservation.date, reservation.time, reservation.status],
        token,
      ),
    );
  }
  for (const request of state.serviceRequests) {
    statements.push(
      guardedInsert(
        database,
        "service_requests",
        ["id", "restaurant_id", "table_code", "type", "status", "created_at"],
        [request.id, restaurantId, request.table, request.type, request.status, request.createdAt],
        token,
      ),
    );
  }
  for (const movement of state.movements.slice(0, 500)) {
    statements.push(
      guardedInsert(
        database,
        "inventory_movements",
        ["id", "restaurant_id", "ingredient_id", "delta", "reason", "created_at"],
        [movement.id, restaurantId, movement.ingredientId, movement.delta, movement.reason, movement.createdAt],
        token,
      ),
    );
  }
  for (const staff of state.staff) {
    statements.push(
      guardedInsert(
        database,
        "staff_members",
        ["id", "restaurant_id", "name", "email", "role", "status", "created_at"],
        [staff.id, restaurantId, staff.name, staff.email, staff.role, staff.status, staff.createdAt],
        token,
      ),
    );
  }
  for (const event of state.auditLog.slice(0, 250)) {
    statements.push(
      guardedInsert(
        database,
        "audit_events",
        ["id", "restaurant_id", "actor", "actor_role", "action", "entity_type", "entity_id", "summary", "created_at"],
        [event.id, restaurantId, event.actor, event.actorRole, event.action, event.entityType, event.entityId, event.summary, event.createdAt],
        token,
      ),
    );
  }
  statements.push(
    database
      .prepare(
        "UPDATE restaurant_operations SET write_token = NULL WHERE id = ? AND write_token = ?",
      )
      .bind(restaurantId, token),
  );

  const results = await database.batch(statements);
  return (results[0]?.meta.changes ?? 0) === 1;
}
