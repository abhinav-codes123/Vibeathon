import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const restaurantOperations = sqliteTable("restaurant_operations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  location: text("location").notNull(),
  serviceChargePercent: real("service_charge_percent").notNull(),
  taxPercent: real("tax_percent").notNull(),
  defaultTurnoverMinutes: integer("default_turnover_minutes").notNull(),
  isOpen: integer("is_open", { mode: "boolean" }).notNull(),
  acceptingOrders: integer("accepting_orders", { mode: "boolean" }).notNull(),
  lastOpenedAt: text("last_opened_at").notNull(),
  lastClosedAt: text("last_closed_at"),
  version: integer("version").notNull().default(1),
  writeToken: text("write_token"),
  updatedAt: text("updated_at").notNull(),
});

export const inventoryItems = sqliteTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    quantity: real("quantity").notNull(),
    par: real("par").notNull(),
    costPerUnit: real("cost_per_unit").notNull(),
  },
  (table) => [index("inventory_restaurant_idx").on(table.restaurantId)],
);

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    basePrepMinutes: integer("base_prep_minutes").notNull(),
    complexity: integer("complexity").notNull(),
    dietaryJson: text("dietary_json").notNull(),
    allergensJson: text("allergens_json").notNull(),
    spice: text("spice").notNull(),
    calories: integer("calories").notNull(),
    image: text("image").notNull(),
    featured: integer("featured", { mode: "boolean" }).notNull(),
    paused: integer("paused", { mode: "boolean" }).notNull(),
  },
  (table) => [index("menu_restaurant_category_idx").on(table.restaurantId, table.category)],
);

export const recipeLines = sqliteTable(
  "recipe_lines",
  {
    menuItemId: text("menu_item_id").notNull(),
    ingredientId: text("ingredient_id").notNull(),
    quantity: real("quantity").notNull(),
  },
  (table) => [
    uniqueIndex("recipe_item_ingredient_idx").on(table.menuItemId, table.ingredientId),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    number: text("number").notNull(),
    tableCode: text("table_code").notNull(),
    guest: text("guest").notNull(),
    customerId: text("customer_id"),
    status: text("status").notNull(),
    notes: text("notes").notNull(),
    allergensJson: text("allergens_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    estimateMinutes: integer("estimate_minutes").notNull(),
    total: integer("total").notNull(),
    paid: integer("paid", { mode: "boolean" }).notNull(),
  },
  (table) => [
    uniqueIndex("orders_restaurant_number_idx").on(table.restaurantId, table.number),
    index("orders_restaurant_status_idx").on(table.restaurantId, table.status),
    index("orders_customer_created_idx").on(table.customerId, table.createdAt),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    menuItemId: text("menu_item_id").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const orderTimeline = sqliteTable(
  "order_timeline",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    status: text("status").notNull(),
    actor: text("actor").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("order_timeline_order_created_idx").on(table.orderId, table.createdAt)],
);

export const diningTables = sqliteTable(
  "dining_tables",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    code: text("code").notNull(),
    seats: integer("seats").notNull(),
    status: text("status").notNull(),
    occupiedMinutes: integer("occupied_minutes"),
  },
  (table) => [
    uniqueIndex("dining_tables_restaurant_code_idx").on(table.restaurantId, table.code),
  ],
);

export const queueEntries = sqliteTable(
  "queue_entries",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    partySize: integer("party_size").notNull(),
    status: text("status").notNull(),
    joinedAt: text("joined_at").notNull(),
    estimateMinutes: integer("estimate_minutes").notNull(),
    managementToken: text("management_token"),
  },
  (table) => [index("queue_restaurant_status_idx").on(table.restaurantId, table.status)],
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    partySize: integer("party_size").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull(),
    status: text("status").notNull(),
  },
  (table) => [index("reservations_restaurant_date_idx").on(table.restaurantId, table.date)],
);

export const serviceRequests = sqliteTable(
  "service_requests",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    tableCode: text("table_code").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("service_requests_restaurant_status_idx").on(table.restaurantId, table.status)],
);

export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    ingredientId: text("ingredient_id").notNull(),
    delta: real("delta").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("inventory_movements_restaurant_created_idx").on(table.restaurantId, table.createdAt)],
);

export const staffMembers = sqliteTable(
  "staff_members",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("staff_restaurant_email_idx").on(table.restaurantId, table.email)],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    actor: text("actor").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("audit_events_restaurant_created_idx").on(table.restaurantId, table.createdAt)],
);
