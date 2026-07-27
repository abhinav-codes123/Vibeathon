import { FlowDineApp, type AppView } from "../components/FlowDineApp";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "../../lib/auth";
import { canAccessView, isProtectedView } from "../../lib/authz";

function viewFor(slug: string[]): AppView {
  const first = slug[0] ?? "";
  if (first === "kitchen") return "kitchen";
  if (first === "staff") return "waiter";
  if (first === "dashboard") return "manager";
  if (["menu", "table", "checkout", "order", "reserve", "queue", "account", "feedback"].includes(first)) {
    return first === "menu" ? "menu" : first === "reserve" ? "reserve" : first === "queue" ? "queue" : "menu";
  }
  return "home";
}

export default async function ProductRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const view = viewFor(slug);
  if (isProtectedView(view)) {
    const context = await getAuthContext();
    const returnPath =
      view === "kitchen" ? "/kitchen" : view === "waiter" ? "/staff" : "/dashboard";
    if (!context.user) {
      redirect(`/login?next=${encodeURIComponent(returnPath)}`);
    }
    if (!canAccessView(context.role, view)) {
      return (
        <main className="route-state">
          <p className="eyebrow">Access denied</p>
          <h1>This workspace is outside your assigned role.</h1>
          <p>
            Your verified account is active, but the restaurant owner has not assigned
            the role required for this workspace.
          </p>
          <div className="account-actions">
            <Link className="button primary" href="/account">View account access</Link>
            <Link className="button ghost" href="/">Return home</Link>
          </div>
        </main>
      );
    }
  }
  return <FlowDineApp initialView={view} />;
}
