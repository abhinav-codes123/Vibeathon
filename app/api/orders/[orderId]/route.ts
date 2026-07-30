import { getAuthContext } from "../../../../lib/auth";
import { readCustomerOrder } from "../../../../lib/customer-orders";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const context = await getAuthContext();
  if (!context.user) {
    return Response.json(
      { error: "Sign in to track this order." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { orderId } = await params;
  const order = await readCustomerOrder(context.user.id, orderId);
  if (!order) {
    return Response.json(
      { error: "Order not found for this account." },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json(
    { order },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
