import type { AuthContext } from "./auth";
import { canManageStaffRole } from "./authz";
import { readState } from "./store";
import { getSupabaseAdminClient } from "./supabase/admin";
import { getSupabaseServerClient } from "./supabase/server";
import type { DemoAction } from "./types";

export async function syncStaffAccess(
  context: AuthContext,
  action: DemoAction,
  origin: string,
) {
  if (
    action.type !== "add_staff" &&
    action.type !== "set_staff_status" &&
    action.type !== "set_staff_role"
  ) {
    return;
  }
  if (
    (context.role !== "manager" && context.role !== "owner") ||
    !context.membership
  ) {
    throw new Error("Manager or owner access is required to manage staff.");
  }
  let name: string;
  let email: string;
  let role: "kitchen" | "waiter" | "manager";
  let status: "pending" | "active" | "inactive";
  if (action.type === "add_staff") {
    name = action.name;
    email = action.email;
    role = action.role;
    status = "pending";
  } else {
    const state = await readState();
    const staff = state.staff.find((entry) => entry.id === action.staffId);
    if (!staff || staff.role === "owner") throw new Error("Staff member not found.");
    if (!canManageStaffRole(context.role, staff.role)) {
      throw new Error("Only the owner can change manager access.");
    }
    name = staff.name;
    email = staff.email;
    role = action.type === "set_staff_role" ? action.role : staff.role;
    status =
      action.type === "set_staff_status"
        ? action.status === "invited"
          ? "pending"
          : action.status
        : staff.status === "invited"
          ? "pending"
          : staff.status;
  }

  if (!canManageStaffRole(context.role, role)) {
    throw new Error("Only the owner can create or change manager access.");
  }

  if (process.env.FLOWDINE_TEST_MODE === "1") {
    return action.type === "add_staff" ? { delivery: "test" as const } : undefined;
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Staff identity service is unavailable.");

  const { error } = await supabase.rpc("manage_restaurant_staff", {
    target_restaurant: context.membership.restaurantId,
    staff_name: name,
    staff_email: email,
    staff_role: role,
    staff_status: status,
  });
  if (error) {
    throw new Error(`Staff invitation could not be synchronized: ${error.message}`);
  }

  if (action.type !== "add_staff") return;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error(
      "The staff record is pending, but invitation email delivery is not configured.",
    );
  }
  const redirectTo = `${origin}/auth/invite`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo,
  });
  if (!inviteError) return { delivery: "sent" as const };

  if (/already|registered|exists/i.test(inviteError.message)) {
    return { delivery: "existing" as const };
  }
  throw new Error(`The staff record is pending, but the email could not be sent: ${inviteError.message}`);
}
