export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export type SupabaseAuthProviders = {
  email: boolean;
  google: boolean;
};

export type SupabaseRuntimeConfig = SupabasePublicConfig & {
  providers: SupabaseAuthProviders;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  return url && publishableKey ? { url, publishableKey } : null;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabasePublicConfig());
}

export function parseSupabaseAuthProviders(
  settings: unknown,
): SupabaseAuthProviders {
  if (!settings || typeof settings !== "object") {
    return { email: false, google: false };
  }

  const external = (settings as { external?: unknown }).external;
  if (!external || typeof external !== "object") {
    return { email: false, google: false };
  }

  const providers = external as Record<string, unknown>;
  return {
    email: providers.email === true,
    google: providers.google === true,
  };
}
