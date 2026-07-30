import { applyAction, can } from "../../../lib/domain";
import { checkRateLimit, updateState } from "../../../lib/store";
import { getAuthContext } from "../../../lib/auth";
import { resolveActionRole } from "../../../lib/authz";
import { publicStateProjection } from "../../../lib/state-projection";
import { ActionValidationError, validateDemoAction } from "../../../lib/validation";
import { syncStaffAccess } from "../../../lib/staff-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  try {
    const action = validateDemoAction(input);
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address =
      request.headers.get("cf-connecting-ip")?.trim() || forwarded || "local-unknown";
    const addressHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address)),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const strictAction = ["place_order", "join_queue", "reserve"].includes(action.type);
    const rate = await checkRateLimit(
      `${addressHash}:${strictAction ? "guest-write" : "action"}`,
      strictAction ? 10 : 60,
      60,
    );
    if (!rate.allowed) {
      return Response.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "retry-after": String(rate.retryAfterSeconds),
            "x-ratelimit-remaining": String(rate.remaining),
          },
        },
      );
    }
    const context = await getAuthContext();
    if (action.type === "place_order" && !context.user) {
      return Response.json(
        {
          error: "Sign in with Google or email to place and track your order.",
          code: "AUTH_REQUIRED_FOR_ORDER",
        },
        { status: 401 },
      );
    }
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
    const authorizedAction =
      action.type === "place_order"
        ? { ...action, customerId: context.user!.id }
        : action;
    await syncStaffAccess(context, authorizedAction);
    const result = await updateState(role, action.type, (state) =>
      applyAction(state, authorizedAction, role, context.user?.email || role),
    );
    return Response.json(
      role === "customer"
        ? { ...result, state: publicStateProjection(result.state) }
        : result,
    );
  } catch (error) {
    const status = error instanceof ActionValidationError ? 400 : 409;
    return Response.json(
      { error: error instanceof Error ? error.message : "The operation could not be completed." },
      { status },
    );
  }
}
