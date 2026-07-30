const DEFAULT_SITE_URL =
  "https://flowdine-ai.abhinavchaudhary484.chatgpt.site";
const siteUrl = new URL(
  process.env.FLOWDINE_SITE_URL || DEFAULT_SITE_URL,
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  return fetch(new URL(path, siteUrl), {
    redirect: "manual",
    ...init,
    headers: {
      "user-agent": "flowdine-production-auth-verifier/1.0",
      ...init.headers,
    },
  });
}

function redirectPath(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, siteUrl).pathname + new URL(location, siteUrl).search : "";
}

const checks = [];

const health = await request("/api/health");
assert(health.status === 200, `Health endpoint returned ${health.status}.`);
assert((await health.json()).status === "ok", "Health payload is not healthy.");
checks.push("public health endpoint");

const publicState = await request("/api/state?view=home");
assert(publicState.status === 200, `Public state returned ${publicState.status}.`);
const publicPayload = await publicState.json();
assert(
  Array.isArray(publicPayload.state?.inventory) &&
    publicPayload.state.inventory.length === 0,
  "Public state exposed protected inventory data.",
);
assert(
  Array.isArray(publicPayload.state?.orders) &&
    publicPayload.state.orders.length === 0,
  "Public state exposed customer orders.",
);
checks.push("public guest state with staff-data redaction");

const authConfig = await request("/api/auth/config");
assert(authConfig.status === 200, `Auth config returned ${authConfig.status}.`);
const authPayload = await authConfig.json();
assert(authPayload.configured === true, "Supabase runtime is not configured.");
assert(authPayload.providers?.email === true, "Email authentication is disabled.");
assert(authPayload.providers?.google === true, "Google OAuth is disabled.");
checks.push("email and Google authentication providers");

const anonymousContext = await request("/api/auth/context");
assert(
  anonymousContext.status === 200,
  `Anonymous auth context returned ${anonymousContext.status}.`,
);
const anonymousPayload = await anonymousContext.json();
assert(anonymousPayload.user === null, "Anonymous request unexpectedly has a user.");
assert(
  anonymousPayload.membership === null,
  "Anonymous request unexpectedly has a restaurant membership.",
);
checks.push("anonymous session isolation");

for (const path of ["/kitchen", "/staff", "/dashboard", "/account", "/orders"]) {
  const response = await request(path);
  assert(
    [303, 307, 308].includes(response.status),
    `${path} did not redirect an anonymous visitor (status ${response.status}).`,
  );
  assert(
    redirectPath(response).startsWith("/login"),
    `${path} did not redirect to the sign-in page.`,
  );
}
checks.push("protected kitchen, waiter, manager, owner/account pages");

const anonymousOrders = await request("/api/orders");
assert(
  anonymousOrders.status === 401,
  `Anonymous customer order history returned ${anonymousOrders.status}.`,
);
const anonymousCheckout = await request("/api/action", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    type: "place_order",
    guest: "Anonymous verifier",
    table: "T01",
    items: [{ menuItemId: "m1", quantity: 1 }],
  }),
});
assert(
  anonymousCheckout.status === 401,
  `Anonymous checkout returned ${anonymousCheckout.status}.`,
);
checks.push("customer order ownership and checkout authentication");

for (const view of ["kitchen", "waiter", "manager"]) {
  const response = await request(`/api/state?view=${view}`);
  assert(
    response.status === 401,
    `${view} state returned ${response.status} instead of 401.`,
  );
  const payload = await response.json();
  assert(payload.code === "AUTH_REQUIRED", `${view} state returned the wrong error code.`);
}
checks.push("protected staff APIs");

const copilot = await request("/api/copilot", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "What needs attention?" }),
});
assert(copilot.status === 401, `Anonymous copilot request returned ${copilot.status}.`);
checks.push("protected manager AI endpoint");

console.log(`Verified ${siteUrl.origin}`);
for (const check of checks) console.log(`  PASS ${check}`);
