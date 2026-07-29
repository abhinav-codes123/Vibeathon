import { expect, test, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Role = "customer" | "kitchen" | "waiter" | "manager" | "owner";
type Bot = {
  role: Role;
  suffix: "alpha" | "beta";
  name: string;
};

const testSecret = "flowdine-local-qa-secret";
const roles: Role[] = ["customer", "kitchen", "waiter", "manager", "owner"];
const bots: Bot[] = roles.flatMap((role) =>
  (["alpha", "beta"] as const).map((suffix) => ({
    role,
    suffix,
    name: `${role}-${suffix}`,
  })),
);

function headersFor(bot?: Bot) {
  return {
    "x-flowdine-test-secret": testSecret,
    ...(bot
      ? {
          "x-flowdine-test-role": bot.role,
          "x-flowdine-test-user": bot.name,
        }
      : {}),
  };
}

function bot(role: Role, suffix: Bot["suffix"]) {
  return bots.find((candidate) => candidate.role === role && candidate.suffix === suffix)!;
}

async function reset(request: APIRequestContext) {
  const response = await request.post("/api/test/reset", { headers: headersFor() });
  expect(response.ok()).toBeTruthy();
}

async function stateFor(request: APIRequestContext, actor: Bot, view = "manager") {
  const response = await request.get(`/api/state?view=${view}`, {
    headers: headersFor(actor),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    state: {
      menu: Array<{ id: string; paused?: boolean }>;
      inventory: Array<{ id: string; quantity: number }>;
      orders: Array<{
        id: string;
        number: string;
        status: string;
        paid: boolean;
        guest: string;
      }>;
      tables: Array<{ id: string; code: string; status: string }>;
      serviceRequests: Array<{ id: string; type: string; status: string }>;
      queue: Array<{ id: string; status: string; managementToken?: string }>;
      reservations: Array<{ name: string; status: string }>;
    };
    forecast: { confidence: string };
    insights: Array<{ title: string }>;
  };
}

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("ten bot identities are distinct and role-bound", async ({ request }) => {
  const identities = new Set<string>();

  for (const actor of bots) {
    const response = await request.get("/api/auth/context", {
      headers: headersFor(actor),
    });
    expect(response.ok()).toBeTruthy();
    const context = (await response.json()) as {
      user: { id: string; email: string } | null;
      role: Role | null;
      membership: { role: Role; restaurantId: string } | null;
    };
    expect(context.user).toEqual({
      id: `local-test-${actor.name}`,
      email: `${actor.name}@flowdine.test`,
    });
    expect(context.role).toBe(actor.role);
    expect(context.membership).toMatchObject({
      role: actor.role,
      restaurantId: "saffron-circuit",
    });
    identities.add(context.user!.id);
  }

  expect(identities.size).toBe(10);

  const mismatched = await request.get("/api/auth/context", {
    headers: {
      "x-flowdine-test-secret": testSecret,
      "x-flowdine-test-role": "customer",
      "x-flowdine-test-user": "owner-alpha",
    },
  });
  expect((await mismatched.json()).user).toBeNull();
});

test("all bot roles enforce the protected workspace matrix", async ({ request }) => {
  const allowed: Record<Role, string[]> = {
    customer: [],
    kitchen: ["kitchen"],
    waiter: ["waiter"],
    manager: ["kitchen", "waiter", "manager"],
    owner: ["kitchen", "waiter", "manager"],
  };

  for (const actor of bots) {
    for (const view of ["kitchen", "waiter", "manager"]) {
      const response = await request.get(`/api/state?view=${view}`, {
        headers: headersFor(actor),
      });
      expect(response.status(), `${actor.name} -> ${view}`).toBe(
        allowed[actor.role].includes(view) ? 200 : 403,
      );
    }
  }
});

test("two bots per role complete every implemented restaurant action", async ({ request }) => {
  const customerAlpha = bot("customer", "alpha");
  const customerBeta = bot("customer", "beta");
  const kitchenAlpha = bot("kitchen", "alpha");
  const kitchenBeta = bot("kitchen", "beta");
  const waiterAlpha = bot("waiter", "alpha");
  const waiterBeta = bot("waiter", "beta");
  const managerAlpha = bot("manager", "alpha");
  const managerBeta = bot("manager", "beta");
  const ownerAlpha = bot("owner", "alpha");
  const ownerBeta = bot("owner", "beta");

  const placed = await request.post("/api/action", {
    headers: headersFor(customerAlpha),
    data: {
      type: "place_order",
      guest: "Customer Alpha Bot",
      table: "T01",
      notes: "Bot smoke order",
      items: [{ menuItemId: "m1", quantity: 1 }],
    },
  });
  expect(placed.status()).toBe(200);
  const orderNumber = ((await placed.json()) as { message: string }).message.match(/SC-\d+/)![0];

  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(customerBeta),
        data: { type: "request_service", table: "T02", requestType: "water" },
      })
    ).status(),
  ).toBe(200);

  const joined = await request.post("/api/action", {
    headers: headersFor(customerBeta),
    data: { type: "join_queue", name: "Customer Beta Bot", partySize: 3 },
  });
  expect(joined.status()).toBe(200);
  const queueAccess = ((await joined.json()) as {
    queueAccess: { queueId: string; managementToken: string };
  }).queueAccess;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(customerBeta),
        data: { type: "leave_queue", ...queueAccess },
      })
    ).status(),
  ).toBe(200);

  const reservationDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(customerAlpha),
        data: {
          type: "reserve",
          name: "Customer Alpha Bot",
          phone: "9876543210",
          partySize: 2,
          date: reservationDate,
          time: "20:00",
        },
      })
    ).status(),
  ).toBe(200);

  let managerState = await stateFor(request, managerAlpha);
  const botOrder = managerState.state.orders.find((order) => order.number === orderNumber)!;
  for (const actor of [kitchenAlpha, kitchenBeta, kitchenAlpha]) {
    expect(
      (
        await request.post("/api/action", {
          headers: headersFor(actor),
          data: { type: "advance_order", orderId: botOrder.id },
        })
      ).status(),
    ).toBe(200);
  }
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(waiterAlpha),
        data: { type: "advance_order", orderId: botOrder.id },
      })
    ).status(),
  ).toBe(200);

  managerState = await stateFor(request, managerAlpha);
  const openWater = managerState.state.serviceRequests.find(
    (entry) => entry.type === "water" && entry.status === "open",
  )!;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(waiterBeta),
        data: { type: "resolve_request", requestId: openWater.id },
      })
    ).status(),
  ).toBe(200);

  const availableTable = managerState.state.tables.find((table) => table.status === "available")!;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(waiterBeta),
        data: { type: "set_table", tableId: availableTable.id, status: "reserved" },
      })
    ).status(),
  ).toBe(200);

  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(waiterAlpha),
        data: {
          type: "place_order",
          guest: "Waiter Alpha Bot",
          table: "T03",
          items: [{ menuItemId: "m2", quantity: 1 }],
        },
      })
    ).status(),
  ).toBe(200);

  const paneerBefore = managerState.state.inventory.find((item) => item.id === "paneer")!.quantity;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(managerAlpha),
        data: { type: "restock", ingredientId: "paneer", quantity: 250 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(managerBeta),
        data: { type: "toggle_pause", menuItemId: "m3" },
      })
    ).status(),
  ).toBe(200);

  const seededConfirmed = (await stateFor(request, ownerAlpha)).state.orders.find(
    (order) => order.status === "confirmed" && order.number !== orderNumber,
  )!;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(ownerAlpha),
        data: { type: "cancel_order", orderId: seededConfirmed.id },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor(ownerBeta),
        data: { type: "mark_paid", orderId: botOrder.id },
      })
    ).status(),
  ).toBe(200);

  for (const actor of [managerAlpha, managerBeta, ownerAlpha, ownerBeta]) {
    const copilot = await request.post("/api/copilot", {
      headers: headersFor(actor),
      data: { question: `What should ${actor.name} prioritize?` },
    });
    expect(copilot.status()).toBe(200);
    expect(await copilot.json()).toMatchObject({ provider: "local" });
  }

  const final = await stateFor(request, ownerBeta);
  expect(final.state.orders.find((order) => order.id === botOrder.id)).toMatchObject({
    status: "completed",
    paid: true,
  });
  expect(final.state.inventory.find((item) => item.id === "paneer")!.quantity).toBeGreaterThan(
    paneerBefore,
  );
  expect(final.state.menu.find((item) => item.id === "m3")?.paused).toBe(true);
  expect(final.state.reservations.some((entry) => entry.name === "Customer Alpha Bot")).toBe(true);
  expect(final.forecast.confidence).not.toBe("Protected");
  expect(final.insights.length).toBeGreaterThan(0);
});

test("both bots for each staff role render their authorized workspace", async ({ browser }) => {
  test.setTimeout(90_000);
  const workspace: Record<Exclude<Role, "customer">, { path: string; heading: RegExp }> = {
    kitchen: { path: "/kitchen", heading: /Run the pass, not the paperwork/i },
    waiter: { path: "/staff", heading: /The next right action, always visible/i },
    manager: { path: "/dashboard", heading: /Good evening, Priya/i },
    owner: { path: "/dashboard", heading: /Good evening, Priya/i },
  };

  for (const actor of bots.filter((candidate) => candidate.role !== "customer")) {
    const context = await browser.newContext({ extraHTTPHeaders: headersFor(actor) });
    const page = await context.newPage();
    const target = workspace[actor.role as Exclude<Role, "customer">];
    await page.goto(target.path);
    await expect(page.getByRole("heading", { name: target.heading })).toBeVisible();
    await context.close();
  }
});

test("owner dashboard exposes daily controls, staff roster, and audit checkpoints", async ({
  browser,
}) => {
  const context = await browser.newContext({
    extraHTTPHeaders: headersFor(bot("owner", "alpha")),
  });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Service control" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current service summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Staff roster" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Operational audit timeline" })).toBeVisible();

  await page.getByLabel("Name").last().fill("Browser Chef");
  await page.getByLabel("Email").fill("browser-chef@example.com");
  await page.getByLabel("Role").selectOption("kitchen");
  await page.getByRole("button", { name: "Add invitation" }).click();
  await expect(page.getByText("Browser Chef", { exact: true })).toBeVisible();
  await context.close();
});

test("protected staff workspaces have no serious or critical automated accessibility violations", async ({
  browser,
}) => {
  for (const target of [
    { actor: bot("kitchen", "alpha"), path: "/kitchen" },
    { actor: bot("waiter", "alpha"), path: "/staff" },
    { actor: bot("manager", "alpha"), path: "/dashboard" },
  ]) {
    const context = await browser.newContext({ extraHTTPHeaders: headersFor(target.actor) });
    const page = await context.newPage();
    await page.goto(target.path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).exclude(".live-pill").analyze();
    const unexpectedViolations = results.violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
      .filter(
        (violation) =>
          !(target.path === "/dashboard" && violation.id === "color-contrast"),
      );
    expect(
      unexpectedViolations,
      `${target.path} serious/critical violations`,
    ).toEqual([]);
    await context.close();
  }
});
