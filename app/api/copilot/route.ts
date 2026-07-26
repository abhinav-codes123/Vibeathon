import { availablePortions, forecastSummary, insightCards } from "../../../lib/domain";
import { readState } from "../../../lib/store";

export const dynamic = "force-dynamic";

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function restaurantContext(state: Awaited<ReturnType<typeof readState>>) {
  const active = state.orders.filter((order) =>
    ["received", "confirmed", "preparing", "ready", "served"].includes(order.status),
  );
  const risks = state.menu
    .map((item) => ({ name: item.name, portions: availablePortions(item, state) }))
    .filter((item) => item.portions <= 5);
  return {
    observedAt: state.updatedAt,
    activeOrders: active.map((order) => ({
      number: order.number,
      status: order.status,
      minutesOld: Math.max(
        0,
        Math.floor((new Date(state.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60_000),
      ),
      promisedMinutes: order.estimateMinutes,
    })),
    occupiedTables: state.tables.filter((table) => table.status === "occupied").length,
    totalTables: state.tables.length,
    waitingParties: state.queue.filter((entry) => entry.status === "waiting").length,
    forecast: forecastSummary(state),
    availabilityRisks: risks,
    deterministicSignals: insightCards(state),
  };
}

function localAnswer(question: string, state: Awaited<ReturnType<typeof readState>>) {
  const signals = insightCards(state);
  const forecast = forecastSummary(state);
  const lead = signals[0];
  return `${lead.title}: ${lead.body} Next, ${signals[1].body} Tonight's explainable forecast is ${forecast.expectedOrders} orders (${forecast.confidence} confidence). This is a deterministic fallback answer for “${question}”.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim().slice(0, 500);
    if (!question) return Response.json({ error: "Ask a specific operations question." }, { status: 400 });

    const state = await readState();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ provider: "local", answer: localAnswer(question, state) });
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are an advisory restaurant operations copilot. Use only the supplied observed metrics. Give at most three prioritized, concise actions and cite the metric behind each. Never invent orders, stock, revenue, or guests. State that a human manager owns the decision.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Question: ${question}\n\nObserved restaurant context:\n${JSON.stringify(restaurantContext(state))}`,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      return Response.json({
        provider: "local",
        answer: localAnswer(question, state),
        degraded: true,
      });
    }
    const payload = (await response.json()) as GeminiResponse;
    const answer = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    return Response.json({
      provider: answer ? "gemini" : "local",
      answer: answer || localAnswer(question, state),
      degraded: !answer,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Copilot is temporarily unavailable." },
      { status: 500 },
    );
  }
}
