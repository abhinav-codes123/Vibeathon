import { applyAction, can } from "../../../lib/domain";
import { updateState } from "../../../lib/store";
import type { DemoAction } from "../../../lib/types";
import { getAuthContext } from "../../../lib/auth";
import { resolveActionRole } from "../../../lib/authz";
import { publicStateProjection } from "../../../lib/state-projection";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const action = (await request.json()) as DemoAction;
    if (!action || typeof action.type !== "string") {
      return Response.json({ error: "A valid action is required." }, { status: 400 });
    }
    const context = await getAuthContext();
    const role = resolveActionRole(context.role, action.type);
    if (!role) {
      const status = context.user ? 403 : 401;
      return Response.json(
        {
          error: context.user
            ? "Your restaurant role cannot perform this operation."
            : "Sign in with an assigned staff role to perform this operation.",
        },
        { status },
      );
    }
    if (!can(role, action.type)) {
      return Response.json({ error: `${role} access cannot perform this operation.` }, { status: 403 });
    }
    const result = await updateState(role, action.type, (state) => applyAction(state, action));
    return Response.json(
      role === "customer"
        ? { ...result, state: publicStateProjection(result.state) }
        : result,
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The operation could not be completed." },
      { status: 409 },
    );
  }
}
