import type { Role } from "./types";
import { getSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { headers } from "next/headers";

export type Membership = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: Role;
};

export type AuthContext = {
  configured: boolean;
  user: { id: string; email: string } | null;
  membership: Membership | null;
  role: Role | null;
};

const roles: Role[] = ["customer", "kitchen", "waiter", "manager", "owner"];

function validRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

async function localTestContext(): Promise<AuthContext | null> {
  if (process.env.NODE_ENV === "production" || process.env.FLOWDINE_TEST_MODE !== "1") {
    return null;
  }
  const secret = process.env.FLOWDINE_TEST_SECRET;
  if (!secret) return { configured: true, user: null, membership: null, role: null };
  const requestHeaders = await headers();
  if (requestHeaders.get("x-flowdine-test-secret") !== secret) {
    return { configured: true, user: null, membership: null, role: null };
  }
  const role = requestHeaders.get("x-flowdine-test-role");
  if (!validRole(role)) return { configured: true, user: null, membership: null, role: null };
  return {
    configured: true,
    user: { id: `local-test-${role}`, email: `${role}@flowdine.test` },
    membership: {
      restaurantId: "saffron-circuit",
      restaurantName: "Saffron Circuit",
      restaurantSlug: "saffron-circuit",
      role,
    },
    role,
  };
}

type MembershipRow = {
  restaurant_id: string;
  role: string;
  restaurants:
    | { name: string; slug: string }
    | Array<{ name: string; slug: string }>
    | null;
};

function restaurantFrom(row: MembershipRow) {
  return Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
}

export async function getAuthContext(): Promise<AuthContext> {
  const testContext = await localTestContext();
  if (testContext) return testContext;

  if (!isSupabaseConfigured()) {
    return { configured: false, user: null, membership: null, role: null };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { configured: false, user: null, membership: null, role: null };
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;
  if (claimsError || typeof subject !== "string") {
    return { configured: true, user: null, membership: null, role: null };
  }

  const email =
    typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "";
  const { data } = await supabase
    .from("restaurant_memberships")
    .select("restaurant_id, role, restaurants(name, slug)")
    .eq("profile_id", subject)
    .limit(1)
    .maybeSingle();

  const row = data as MembershipRow | null;
  const restaurant = row ? restaurantFrom(row) : null;
  const membership =
    row && restaurant && validRole(row.role)
      ? {
          restaurantId: row.restaurant_id,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          role: row.role,
        }
      : null;

  return {
    configured: true,
    user: { id: subject, email },
    membership,
    role: membership?.role ?? "customer",
  };
}

export function safeReturnPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
