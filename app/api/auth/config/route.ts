import {
  getSupabasePublicConfig,
  parseSupabaseAuthProviders,
} from "../../../../lib/supabase/config";

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

  let providers = { email: false, google: false };
  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      cache: "no-store",
      headers: { apikey: config.publishableKey },
    });
    if (response.ok) {
      providers = parseSupabaseAuthProviders(await response.json());
    }
  } catch {
    // Fail closed so the UI never offers a provider that cannot authenticate.
  }

  return Response.json(
    { configured: true, ...config, providers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
