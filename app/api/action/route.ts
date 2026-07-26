import { applyAction, can } from "../../../lib/domain";
import { updateState } from "../../../lib/store";
import type { DemoAction, Role } from "../../../lib/types";

export const dynamic = "force-dynamic";

const roles: Role[] = ["customer", "kitchen", "waiter", "manager", "owner"];

export async function POST(request: Request) {
  try {
    const roleHeader = request.headers.get("x-demo-role") ?? "customer";
    const role: Role = roles.includes(roleHeader as Role) ? (roleHeader as Role) : "customer";
    const action = (await request.json()) as DemoAction;
    if (!action || typeof action.type !== "string") {
      return Response.json({ error: "A valid action is required." }, { status: 400 });
    }
    if (!can(role, action.type)) {
      return Response.json({ error: `${role} access cannot perform this operation.` }, { status: 403 });
    }
    const result = await updateState(role, action.type, (state) => applyAction(state, action));
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The operation could not be completed." },
      { status: 409 },
    );
  }
}
