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
  var __flowDineLocalRateLimits:
    | Map<string, { count: number; resetAt: number }>
    | undefined;
}

const timestampKeys = ["createdAt", "updatedAt", "joinedAt"] as const;

function rebaseLiveTimestamps(input: AppState) {
  const state = structuredClone(input);
  const sourceTime = new Date(state.updatedAt).getTime();
  const destinationTime = Date.now();
  const offset = Number.isFinite(sourceTime) ? destinationTime - sourceTime : 0;
  const shift = (value: string) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time + offset).toISOString() : new Date(destinationTime).toISOString();
  };
  for (const collection of [state.orders, state.queue, state.serviceRequests, state.movements]) {
    for (const item of collection) {
      for (const key of timestampKeys) {
        if (key in item && typeof item[key as keyof typeof item] === "string") {
          (item as unknown as Record<string, string>)[key] = shift(
            item[key as keyof typeof item] as string,
          );
        }
      }
    }
  }
  state.updatedAt = new Date(destinationTime).toISOString();
  return state;
}

function freshSeedState() {
  return rebaseLiveTimestamps(seedState);
}

async function getDatabase(): Promise<D1DatabaseLike | null> {
  if (process.env.FLOWDINE_LOCAL === "1") return null;
  const workers = await import("cloudflare:workers");
  return (workers.env as unknown as { DB: D1DatabaseLike }).DB;
}

function localState() {
  globalThis.__flowDineLocalState ??= freshSeedState();
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
  await database.prepare(
    `CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    )`,
  ).run();
  const row = await database.prepare(
    "SELECT restaurant_id FROM app_state WHERE restaurant_id = ?",
  )
    .bind(seedState.restaurant.id)
    .first();
  if (!row) {
    const fresh = freshSeedState();
    await database.prepare(
      "INSERT INTO app_state (restaurant_id, payload, version, updated_at) VALUES (?, ?, 1, ?)",
    )
      .bind(seedState.restaurant.id, JSON.stringify(fresh), fresh.updatedAt)
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
  const state = JSON.parse(row.payload) as AppState;
  const updatedAt = new Date(state.updatedAt).getTime();
  if (!Number.isFinite(updatedAt) || updatedAt < Date.now() - 365 * 24 * 60 * 60 * 1_000) {
    const repaired = rebaseLiveTimestamps(state);
    await database.prepare(
      "UPDATE app_state SET payload = ?, version = version + 1, updated_at = ? WHERE restaurant_id = ? AND version = ?",
    )
      .bind(JSON.stringify(repaired), repaired.updatedAt, seedState.restaurant.id, row.version)
      .run();
    return repaired;
  }
  return state;
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
  const fresh = freshSeedState();
  if (!database) {
    globalThis.__flowDineLocalState = structuredClone(fresh);
    globalThis.__flowDineLocalRateLimits = new Map();
    return fresh;
  }
  await database.prepare(
    "UPDATE app_state SET payload = ?, version = version + 1, updated_at = ? WHERE restaurant_id = ?",
  )
    .bind(JSON.stringify(fresh), fresh.updatedAt, seedState.restaurant.id)
    .run();
  return fresh;
}

export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
) {
  const database = await ensureStore();
  const now = Date.now();
  const nextReset = now + windowSeconds * 1_000;
  if (!database) {
    globalThis.__flowDineLocalRateLimits ??= new Map();
    const existing = globalThis.__flowDineLocalRateLimits.get(bucketKey);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 1, resetAt: nextReset }
        : { count: existing.count + 1, resetAt: existing.resetAt };
    globalThis.__flowDineLocalRateLimits.set(bucketKey, bucket);
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }

  const row = await database
    .prepare(
      `INSERT INTO rate_limits (bucket_key, count, reset_at)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END
       RETURNING count, reset_at`,
    )
    .bind(bucketKey, nextReset, now, now, nextReset)
    .first<{ count: number; reset_at: number }>();
  const count = row?.count ?? limit + 1;
  const resetAt = row?.reset_at ?? nextReset;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
  };
}
