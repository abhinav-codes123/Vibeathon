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

export type Order = {
  id: string;
  number: string;
  table: string;
  guest: string;
  status: OrderStatus;
  items: OrderItem[];
  notes: string;
  allergens: string[];
  createdAt: string;
  updatedAt: string;
  estimateMinutes: number;
  total: number;
  paid: boolean;
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

export type AppState = {
  restaurant: {
    id: string;
    name: string;
    tagline: string;
    location: string;
    serviceChargePercent: number;
    taxPercent: number;
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
  updatedAt: string;
};

export type DemoAction =
  | {
      type: "place_order";
      guest: string;
      table: string;
      notes?: string;
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
  | { type: "mark_paid"; orderId: string };

export type ActionResult = {
  state: AppState;
  message: string;
  queueAccess?: {
    queueId: string;
    managementToken: string;
  };
};
