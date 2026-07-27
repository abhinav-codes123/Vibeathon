import { headers } from "next/headers";
import { resetState } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.FLOWDINE_TEST_MODE !== "1") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const secret = process.env.FLOWDINE_TEST_SECRET;
  const requestHeaders = await headers();
  if (!secret || requestHeaders.get("x-flowdine-test-secret") !== secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const state = await resetState();
  return Response.json({ ok: true, updatedAt: state.updatedAt });
}
