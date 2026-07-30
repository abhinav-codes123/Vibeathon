import { getAuthContext } from "../../../lib/auth";
import { readCustomerOrders } from "../../../lib/customer-orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthContext();
  if (!context.user) {
    return Response.json(
      { error: "Sign in to view your orders." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const orders = await readCustomerOrders(context.user.id);
  return Response.json(
    { orders },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
