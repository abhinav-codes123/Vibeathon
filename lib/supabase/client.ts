"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicConfig } from "./config";

let browserClient: SupabaseClient | null = null;
let configPromise: Promise<SupabasePublicConfig> | null = null;

async function loadConfig() {
  configPromise ??= fetch("/api/auth/config", { cache: "no-store" })
    .then(async (response) => {
      const payload = (await response.json()) as
        | ({ configured: true } & SupabasePublicConfig)
        | { configured: false; error: string };
      if (!response.ok || !payload.configured) {
        throw new Error(
          "Authentication is not configured yet. Add the Supabase runtime variables and redeploy.",
        );
      }
      return payload;
    });
  return configPromise;
}

export async function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { url, publishableKey } = await loadConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
