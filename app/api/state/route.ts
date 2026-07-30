import { availablePortions, forecastSummary, insightCards } from "../../../lib/domain";
import { readState } from "../../../lib/store";
import { getAuthContext } from "../../../lib/auth";
import { canAccessView, isProtectedView } from "../../../lib/authz";
import { publicStateProjection } from "../../../lib/state-projection";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
} as const;

export async function GET(request: Request) {
  try {
    const requestedView = new URL(request.url).searchParams.get("view") ?? "home";
    const protectedView = isProtectedView(requestedView) ? requestedView : null;
    if (protectedView) {
      const context = await getAuthContext();
      if (!context.configured) {
        return Response.json(
          { error: "Staff authentication is not configured yet.", code: "AUTH_NOT_CONFIGURED" },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }
      if (!context.user) {
        return Response.json(
          { error: "Sign in to open this staff workspace.", code: "AUTH_REQUIRED" },
          { status: 401, headers: NO_STORE_HEADERS },
        );
      }
      if (!canAccessView(context.role, protectedView)) {
        return Response.json(
          { error: "Your assigned restaurant role cannot open this workspace.", code: "ROLE_REQUIRED" },
          { status: 403, headers: NO_STORE_HEADERS },
        );
      }
    }

    const sourceState = await readState();
    const state = protectedView ? sourceState : publicStateProjection(sourceState);
    return Response.json({
      state,
      availability: Object.fromEntries(
        sourceState.menu.map((item) => [item.id, availablePortions(item, sourceState)]),
      ),
      forecast: protectedView
        ? forecastSummary(sourceState)
        : { expectedOrders: 0, confidence: "Protected", risks: [] },
      insights: protectedView ? insightCards(sourceState) : [],
    }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load restaurant state." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
