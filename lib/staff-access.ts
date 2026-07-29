import type { AuthContext } from "./auth";
import { readState } from "./store";
import { getSupabaseServerClient } from "./supabase/server";
import type { DemoAction } from "./types";

export async function syncStaffAccess(
  context: AuthContext,
  action: DemoAction,
) {
  if (action.type !== "add_staff" && action.type !== "set_staff_status") return;
  if (context.role !== "owner" || !context.membership) {
    throw new Error("Owner access is required to manage staff.");
  }
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.FLOWDINE_TEST_MODE === "1"
  ) {
    return;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Staff identity service is unavailable.");

  let email: string;
  let role: "kitchen" | "waiter" | "manager";
  let status: "pending" | "active" | "inactive";
  if (action.type === "add_staff") {
    email = action.email;
    role = action.role;
    status = "pending";
  } else {
    const state = await readState();
    const staff = state.staff.find((entry) => entry.id === action.staffId);
    if (!staff || staff.role === "owner") throw new Error("Staff member not found.");
    email = staff.email;
    role = staff.role;
    status = action.status === "invited" ? "pending" : action.status;
  }

  const { error } = await supabase.rpc("owner_manage_staff", {
    target_restaurant: context.membership.restaurantId,
    staff_email: email,
    staff_role: role,
    staff_status: status,
  });
  if (error) {
    throw new Error(`Staff invitation could not be synchronized: ${error.message}`);
  }
}
