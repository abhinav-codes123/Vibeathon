import { getAuthContext } from "../../../lib/auth";
import { readState } from "../../../lib/store";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import type { StaffMember } from "../../../lib/types";

export const dynamic = "force-dynamic";

type InvitationRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: StaffMember["role"];
  status: "pending" | "active" | "inactive";
  created_at: string;
  accepted_at: string | null;
};

export async function GET() {
  const context = await getAuthContext();
  if (!context.user) {
    return Response.json(
      { error: "Sign in to view restaurant staff." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (
    !context.membership ||
    (context.role !== "manager" && context.role !== "owner")
  ) {
    return Response.json(
      { error: "Manager or owner access is required." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const state = await readState();
  const fallback = state.staff.map((staff) => ({
    ...staff,
    actionable: staff.role !== "owner",
    acceptedAt: staff.status === "active" ? staff.createdAt : null,
  }));
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      { staff: fallback },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("staff_invitations")
    .select("id, full_name, email, role, status, created_at, accepted_at")
    .eq("restaurant_id", context.membership.restaurantId)
    .order("created_at", { ascending: true });
  if (error) {
    return Response.json(
      { error: `Unable to load staff invitations: ${error.message}` },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const invitations = (data ?? []) as InvitationRow[];
  const byEmail = new Map(
    invitations.map((invitation) => [invitation.email.toLowerCase(), invitation]),
  );
  const staff = fallback.map((member) => {
    const invitation = byEmail.get(member.email.toLowerCase());
    if (!invitation) return member;
    byEmail.delete(member.email.toLowerCase());
    return {
      ...member,
      name: invitation.full_name || member.name,
      role: invitation.role,
      status: invitation.status === "pending" ? "invited" as const : invitation.status,
      acceptedAt: invitation.accepted_at,
    };
  });

  for (const invitation of byEmail.values()) {
    staff.push({
      id: `invitation:${invitation.id}`,
      name: invitation.full_name || invitation.email,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status === "pending" ? "invited" : invitation.status,
      createdAt: invitation.created_at,
      acceptedAt: invitation.accepted_at,
      actionable: false,
    });
  }

  return Response.json(
    { staff },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
