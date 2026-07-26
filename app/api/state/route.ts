import { availablePortions, forecastSummary, insightCards } from "../../../lib/domain";
import { readState } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await readState();
    return Response.json({
      state,
      availability: Object.fromEntries(
        state.menu.map((item) => [item.id, availablePortions(item, state)]),
      ),
      forecast: forecastSummary(state),
      insights: insightCards(state),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load restaurant state." },
      { status: 500 },
    );
  }
}
