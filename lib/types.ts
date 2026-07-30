export type Role = "customer" | "kitchen" | "waiter" | "manager" | "owner";
export type OrderStatus =
  | "received"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  par: number;
  costPerUnit: number;
};

export type RecipeLine = { ingredientId: string; quantity: number };

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  basePrepMinutes: number;
  complexity: 1 | 2 | 3;
  dietary: ("vegetarian" | "vegan" | "non-vegetarian")[];
  allergens: string[];
  spice: "mild" | "medium" | "hot";
  calories: number;
  image: string;
  featured?: boolean;
  paused?: boolean;
  recipe: RecipeLine[];
};

export type OrderItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OrderTimelineEvent = {
  id: string;
  status: OrderStatus;
  actor: string;
  createdAt: string;
};

export type Order = {
  id: string;
  number: string;
  table: string;
  guest: string;
  customerId?: string;
  status: OrderStatus;
  items: OrderItem[];
  notes: string;
  allergens: string[];
  createdAt: string;
  updatedAt: string;
  estimateMinutes: number;
  total: number;
  paid: boolean;
  timeline: OrderTimelineEvent[];
};

export type DiningTable = {
  id: string;
  code: string;
  seats: number;
  status:
    | "available"
    | "reserved"
    | "occupied"
    | "bill_requested"
    | "cleaning"
    | "out_of_service";
  occupiedMinutes?: number;
};

export type QueueEntry = {
  id: string;
  name: string;
  partySize: number;
  status: "waiting" | "seated" | "left";
  joinedAt: string;
  estimateMinutes: number;
  managementToken?: string;
};

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  status: "confirmed" | "seated" | "cancelled";
};

export type ServiceRequest = {
  id: string;
  table: string;
  type: "assistance" | "bill" | "water";
  status: "open" | "resolved";
  createdAt: string;
};

export type InventoryMovement = {
  id: string;
  ingredientId: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: Exclude<Role, "customer">;
  status: "active" | "inactive" | "invited";
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  actorRole: Role;
  action: string;
  entityType: "order" | "table" | "inventory" | "menu" | "service" | "queue" | "reservation" | "restaurant" | "staff";
  entityId: string;
  summary: string;
  createdAt: string;
};

export type AppState = {
  restaurant: {
    id: string;
    name: string;
    tagline: string;
    location: string;
    serviceChargePercent: number;
    taxPercent: number;
    defaultTurnoverMinutes: number;
    isOpen: boolean;
    acceptingOrders: boolean;
    lastOpenedAt: string;
    lastClosedAt?: string;
  };
  inventory: InventoryItem[];
  menu: MenuItem[];
  orders: Order[];
  tables: DiningTable[];
  queue: QueueEntry[];
  reservations: Reservation[];
  serviceRequests: ServiceRequest[];
  movements: InventoryMovement[];
  revenueHistory: { day: string; revenue: number; orders: number }[];
  hourlyDemand: { hour: string; actual: number; forecast: number }[];
  feedback: { rating: number; comment: string; author: string }[];
  staff: StaffMember[];
  auditLog: AuditEvent[];
  updatedAt: string;
};

export type DemoAction =
  | {
      type: "place_order";
      guest: string;
      table: string;
      notes?: string;
      customerId?: string;
      items: { menuItemId: string; quantity: number }[];
    }
  | { type: "advance_order"; orderId: string }
  | { type: "cancel_order"; orderId: string }
  | { type: "request_service"; table: string; requestType: "assistance" | "bill" | "water" }
  | { type: "resolve_request"; requestId: string }
  | { type: "join_queue"; name: string; partySize: number }
  | { type: "leave_queue"; queueId: string; managementToken: string }
  | { type: "reserve"; name: string; phone: string; partySize: number; date: string; time: string }
  | { type: "toggle_pause"; menuItemId: string }
  | { type: "restock"; ingredientId: string; quantity: number }
  | { type: "set_table"; tableId: string; status: DiningTable["status"] }
  | { type: "mark_paid"; orderId: string }
  | { type: "set_accepting_orders"; accepting: boolean }
  | { type: "set_restaurant_open"; open: boolean }
  | { type: "set_staff_status"; staffId: string; status: StaffMember["status"] }
  | {
      type: "set_staff_role";
      staffId: string;
      role: Exclude<Role, "customer" | "owner">;
    }
  | {
      type: "add_staff";
      name: string;
      email: string;
      role: Exclude<Role, "customer" | "owner">;
    }
  | { type: "set_reservation_status"; reservationId: string; status: Reservation["status"] };

export type ActionResult = {
  state: AppState;
  message: string;
  orderAccess?: {
    orderId: string;
    orderNumber: string;
  };
  queueAccess?: {
    queueId: string;
    managementToken: string;
  };
};
