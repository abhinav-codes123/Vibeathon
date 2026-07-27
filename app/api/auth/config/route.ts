import { getSupabasePublicConfig } from "../../../../lib/supabase/config";

export async function GET() {
  const config = getSupabasePublicConfig();
  if (!config) {
    return Response.json(
      {
        configured: false,
        error: "Supabase authentication runtime variables are missing.",
      },
      { status: 503 },
    );
  }

  return Response.json({ configured: true, ...config });
}
