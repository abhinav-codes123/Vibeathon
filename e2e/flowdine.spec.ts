import { expect, test, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const testSecret = "flowdine-local-qa-secret";
const headersFor = (role?: "customer" | "kitchen" | "waiter" | "manager" | "owner") => ({
  "x-flowdine-test-secret": testSecret,
  ...(role ? { "x-flowdine-test-role": role } : {}),
});

async function reset(request: APIRequestContext) {
  const response = await request.post("/api/test/reset", {
    headers: headersFor(),
  });
  expect(response.ok()).toBeTruthy();
}

async function stateFor(
  request: APIRequestContext,
  role: "customer" | "kitchen" | "waiter" | "manager" | "owner",
  view = "manager",
) {
  const response = await request.get(`/api/state?view=${view}`, {
    headers: headersFor(role),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    state: {
      orders: Array<{
        id: string;
        number: string;
        status: string;
        paid: boolean;
        table: string;
      }>;
      inventory: Array<{ id: string; quantity: number }>;
      tables: Array<{ code: string; status: string }>;
    };
  };
}

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("master restaurant workflow keeps guest, kitchen, waiter, payment, inventory, and table state consistent", async ({
  request,
}) => {
  const before = await stateFor(request, "manager");
  const paneerBefore = before.state.inventory.find((item) => item.id === "paneer")!.quantity;

  const placed = await request.post("/api/action", {
    data: {
      type: "place_order",
      guest: "Master QA Guest",
      table: "T01",
      notes: "No onion",
      items: [{ menuItemId: "m1", quantity: 1 }],
    },
  });
  expect(placed.status()).toBe(200);
  const placedBody = (await placed.json()) as { message: string };
  const orderNumber = placedBody.message.match(/SC-\d+/)?.[0];
  expect(orderNumber).toBeTruthy();

  let manager = await stateFor(request, "manager");
  const orderId = manager.state.orders.find((order) => order.number === orderNumber)!.id;
  expect(
    manager.state.inventory.find((item) => item.id === "paneer")!.quantity,
  ).toBe(paneerBefore - 180);

  for (const role of ["kitchen", "kitchen", "waiter"] as const) {
    const response = await request.post("/api/action", {
      headers: headersFor(role),
      data: { type: "advance_order", orderId },
    });
    expect(response.status()).toBe(200);
  }

  const payment = await request.post("/api/action", {
    headers: headersFor("manager"),
    data: { type: "mark_paid", orderId },
  });
  expect(payment.status()).toBe(200);

  manager = await stateFor(request, "manager");
  const completed = manager.state.orders.find((order) => order.id === orderId)!;
  expect(completed).toMatchObject({ status: "completed", paid: true });
  expect(manager.state.tables.find((table) => table.code === "T01")?.status).toBe("cleaning");
  expect(
    manager.state.inventory.find((item) => item.id === "paneer")!.quantity,
  ).toBe(paneerBefore - 180);
});

test("authorization matrix rejects anonymous, customer, and cross-role staff escalation", async ({
  request,
}) => {
  expect((await request.get("/api/state?view=manager")).status()).toBe(401);
  expect(
    (
      await request.post("/api/action", {
        data: { type: "restock", ingredientId: "paneer", quantity: 10 },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor("customer"),
        data: { type: "restock", ingredientId: "paneer", quantity: 10 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/state?view=manager", {
        headers: headersFor("kitchen"),
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/state?view=kitchen", {
        headers: headersFor("waiter"),
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/state?view=kitchen", {
        headers: headersFor("manager"),
      })
    ).status(),
  ).toBe(200);

  const manager = await stateFor(request, "manager");
  const ready = manager.state.orders.find((order) => order.status === "ready")!;
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor("kitchen"),
        data: { type: "advance_order", orderId: ready.id },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/action", {
        headers: headersFor("waiter"),
        data: { type: "advance_order", orderId: ready.id },
      })
    ).status(),
  ).toBe(200);
});

test("anonymous payment and queue IDOR attempts fail without changing state", async ({ request }) => {
  const manager = await stateFor(request, "manager");
  const order = manager.state.orders[0];
  expect(
    (
      await request.post("/api/action", {
        data: { type: "mark_paid", orderId: order.id },
      })
    ).status(),
  ).toBe(401);

  const joined = await request.post("/api/action", {
    data: { type: "join_queue", name: "Receipt Owner", partySize: 2 },
  });
  expect(joined.status()).toBe(200);
  const access = ((await joined.json()) as {
    queueAccess: { queueId: string; managementToken: string };
  }).queueAccess;
  expect(access.managementToken).toHaveLength(72);

  expect(
    (
      await request.post("/api/action", {
        data: {
          type: "leave_queue",
          queueId: access.queueId,
          managementToken: "0000000000000000",
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/action", {
        data: { type: "leave_queue", ...access },
      })
    ).status(),
  ).toBe(200);
});

test("runtime validation rejects malformed JSON, invalid quantities, past reservations, and unusable tables", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/action", {
        headers: { "content-type": "application/json" },
        data: "not-json",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/action", {
        data: {
          type: "place_order",
          guest: "QA",
          table: "T01",
          items: [{ menuItemId: "m1", quantity: 1.5 }],
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/action", {
        data: {
          type: "reserve",
          name: "QA",
          phone: "9876543210",
          partySize: 2,
          date: "2020-01-01",
          time: "20:00",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/action", {
        data: {
          type: "place_order",
          guest: "QA",
          table: "T06",
          items: [{ menuItemId: "m1", quantity: 1 }],
        },
      })
    ).status(),
  ).toBe(409);
});

test("public write rate limits fail closed with a retry hint", async ({ request }) => {
  const statuses: number[] = [];
  for (let index = 0; index < 11; index += 1) {
    const response = await request.post("/api/action", {
      data: {
        type: "reserve",
        name: `Rate QA ${index}`,
        phone: "9876543210",
        partySize: 2,
        date: new Date().toISOString().slice(0, 10),
        time: "20:00",
      },
    });
    statuses.push(response.status());
    if (index === 10) expect(response.headers()["retry-after"]).toBeTruthy();
  }
  expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
  expect(statuses[10]).toBe(429);
});

test("final available portions are not oversold by concurrent requests", async ({ request }) => {
  const attempts = await Promise.all(
    ["T01", "T02", "T03"].map((table, index) =>
      request.post("/api/action", {
        data: {
          type: "place_order",
          guest: `Concurrent ${index + 1}`,
          table,
          items: [{ menuItemId: "m4", quantity: 1 }],
        },
      }),
    ),
  );
  expect(attempts.map((response) => response.status()).sort()).toEqual([200, 200, 409]);
  const manager = await stateFor(request, "manager");
  expect(manager.state.inventory.find((item) => item.id === "prawn")!.quantity).toBe(20);
});

test("guest cart and private queue receipt survive a refresh", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Dinner, without the guesswork." })).toBeVisible();
  await page.getByRole("button", { name: /Add .* to cart/ }).first().click();
  await expect(page.getByRole("button", { name: /Cart/ })).toContainText("1");
  await page.reload();
  await expect(page.getByRole("button", { name: /Cart/ })).toContainText("1");

  await page.goto("/queue");
  await page.getByRole("button", { name: "Get live position" }).click();
  await expect(page.getByRole("button", { name: "Leave" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Leave" })).toBeVisible();
});

test("protected staff pages render only with an authorized verified role", async ({ browser }) => {
  const unauthorized = await browser.newPage();
  await unauthorized.goto("/dashboard");
  await expect(unauthorized).toHaveURL(/\/login\?next=%2Fdashboard/);
  await unauthorized.close();

  const managerContext = await browser.newContext({
    extraHTTPHeaders: headersFor("manager"),
  });
  const manager = await managerContext.newPage();
  await manager.goto("/dashboard");
  await expect(manager.getByRole("heading", { name: "Good evening, Priya." })).toBeVisible();
  await managerContext.close();
});

test("critical public pages have no serious or critical automated accessibility violations", async ({
  page,
}) => {
  for (const path of ["/", "/menu", "/reserve", "/queue"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".loading-shell")).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .exclude(".live-pill")
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
      `${path} serious/critical violations`,
    ).toEqual([]);
  }
});
