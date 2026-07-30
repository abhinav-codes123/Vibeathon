import { can } from "./domain.ts";
import type { Role } from "./types";

export type ProtectedView = "kitchen" | "waiter" | "manager";

const viewAccess: Record<ProtectedView, Role[]> = {
  kitchen: ["kitchen", "manager", "owner"],
  waiter: ["waiter", "manager", "owner"],
  manager: ["manager", "owner"],
};

export function isProtectedView(value: string): value is ProtectedView {
  return value === "kitchen" || value === "waiter" || value === "manager";
}

export function canAccessView(role: Role | null, view: ProtectedView) {
  return Boolean(role && viewAccess[view].includes(role));
}

export function resolveActionRole(role: Role | null, action: string): Role | null {
  if (role && can(role, action)) return role;
  if (can("customer", action)) return "customer";
  return null;
}

export function canManageStaffRole(
  actorRole: Role | null,
  targetRole: Exclude<Role, "customer">,
) {
  if (actorRole === "owner") return true;
  return actorRole === "manager" && (targetRole === "kitchen" || targetRole === "waiter");
}
