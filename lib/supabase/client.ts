"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseRuntimeConfig } from "./config";

let browserClient: SupabaseClient | null = null;
let configPromise: Promise<SupabaseRuntimeConfig> | null = null;

export async function getSupabaseBrowserConfig() {
  configPromise ??= fetch("/api/auth/config", { cache: "no-store" })
    .then(async (response) => {
      const payload = (await response.json()) as
        | ({ configured: true } & SupabaseRuntimeConfig)
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
  const { url, publishableKey } = await getSupabaseBrowserConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
