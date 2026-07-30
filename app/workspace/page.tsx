import { redirect } from "next/navigation";
import { getAuthContext, workspacePathForRole } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkspaceRouterPage() {
  const context = await getAuthContext();
  if (!context.user) redirect("/login?next=/workspace");
  redirect(workspacePathForRole(context.role));
}
