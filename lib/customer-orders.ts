import { readState } from "./store";
import type { Order } from "./types";

export type CustomerOrder = Omit<Order, "customerId">;

function customerView(order: Order): CustomerOrder {
  const visible = { ...order };
  delete visible.customerId;
  return visible;
}

export async function readCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  const state = await readState();
  return state.orders
    .filter((order) => order.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(customerView);
}

export async function readCustomerOrder(
  customerId: string,
  orderId: string,
): Promise<CustomerOrder | null> {
  const orders = await readCustomerOrders(customerId);
  return orders.find((order) => order.id === orderId) ?? null;
}
