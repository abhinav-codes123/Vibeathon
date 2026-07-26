import { FlowDineApp, type AppView } from "../components/FlowDineApp";

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
  return <FlowDineApp initialView={viewFor(slug)} />;
}
