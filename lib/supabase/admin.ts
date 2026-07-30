import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

export function getSupabaseAdminClient() {
  const config = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !secretKey) return null;

  return createClient(config.url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
