import { getAuthContext } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthContext();
  return Response.json(
    {
      configured: context.configured,
      user: context.user ? { email: context.user.email } : null,
      membership: context.membership,
      role: context.role,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
