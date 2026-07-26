import { seedState } from "./seed";
import type { AppState } from "./types";

type StateRow = { payload: string; version: number };
type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): ReturnType<D1DatabaseLike["prepare"]>;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    run(): Promise<{ meta: { changes?: number } }>;
  };
};

declare global {
  var __flowDineLocalState: AppState | undefined;
}

async function getDatabase(): Promise<D1DatabaseLike | null> {
  if (process.env.FLOWDINE_LOCAL === "1") return null;
  const workers = await import("cloudflare:workers");
  return (workers.env as unknown as { DB: D1DatabaseLike }).DB;
}

function localState() {
  globalThis.__flowDineLocalState ??= structuredClone(seedState);
  return globalThis.__flowDineLocalState;
}

async function ensureStore() {
  const database = await getDatabase();
  if (!database) return null;
  await database.prepare(
    `CREATE TABLE IF NOT EXISTS app_state (
      restaurant_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
  ).run();
  await database.prepare(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  ).run();
  const row = await database.prepare(
    "SELECT restaurant_id FROM app_state WHERE restaurant_id = ?",
  )
    .bind(seedState.restaurant.id)
    .first();
  if (!row) {
    await database.prepare(
      "INSERT INTO app_state (restaurant_id, payload, version, updated_at) VALUES (?, ?, 1, ?)",
    )
      .bind(seedState.restaurant.id, JSON.stringify(seedState), seedState.updatedAt)
      .run();
  }
  return database;
}

export async function readState(): Promise<AppState> {
  const database = await ensureStore();
  if (!database) return structuredClone(localState());
  const row = await database.prepare(
    "SELECT payload, version FROM app_state WHERE restaurant_id = ?",
  )
    .bind(seedState.restaurant.id)
    .first<StateRow>();
  if (!row) throw new Error("Restaurant state is unavailable.");
  return JSON.parse(row.payload) as AppState;
}

export async function updateState(
  actorRole: string,
  actionName: string,
  updater: (state: AppState) => { state: AppState; message: string },
) {
  const database = await ensureStore();
  if (!database) {
    const result = updater(structuredClone(localState()));
    globalThis.__flowDineLocalState = result.state;
    return result;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await database.prepare(
      "SELECT payload, version FROM app_state WHERE restaurant_id = ?",
    )
      .bind(seedState.restaurant.id)
      .first<StateRow>();
    if (!row) throw new Error("Restaurant state is unavailable.");
    const result = updater(JSON.parse(row.payload) as AppState);
    const write = await database.prepare(
      "UPDATE app_state SET payload = ?, version = version + 1, updated_at = ? WHERE restaurant_id = ? AND version = ?",
    )
      .bind(JSON.stringify(result.state), result.state.updatedAt, seedState.restaurant.id, row.version)
      .run();
    if ((write.meta.changes ?? 0) === 1) {
      await database.prepare(
        "INSERT INTO audit_logs (id, restaurant_id, actor_role, action, created_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(crypto.randomUUID(), seedState.restaurant.id, actorRole, actionName, new Date().toISOString())
        .run();
      return result;
    }
  }
  throw new Error("Restaurant state changed at the same time. Please retry.");
}

export async function resetState() {
  const database = await ensureStore();
  const fresh = { ...seedState, updatedAt: new Date().toISOString() };
  if (!database) {
    globalThis.__flowDineLocalState = structuredClone(fresh);
    return fresh;
  }
  await database.prepare(
    "UPDATE app_state SET payload = ?, version = version + 1, updated_at = ? WHERE restaurant_id = ?",
  )
    .bind(JSON.stringify(fresh), fresh.updatedAt, seedState.restaurant.id)
    .run();
  return fresh;
}
