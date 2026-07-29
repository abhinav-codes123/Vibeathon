import {
  ensureNormalizedSchema,
  readNormalizedState,
  upgradeState,
  writeNormalizedState,
  type D1DatabaseLike,
} from "./normalized-store";
import { seedState } from "./seed";
import type { AppState } from "./types";

declare global {
  var __flowDineLocalState: AppState | undefined;
  var __flowDineLocalVersion: number | undefined;
  var __flowDineLocalRateLimits:
    | Map<string, { count: number; resetAt: number }>
    | undefined;
}

const timestampKeys = ["createdAt", "updatedAt", "joinedAt"] as const;

function rebaseLiveTimestamps(input: AppState) {
  const state = upgradeState(input);
  const sourceTime = new Date(state.updatedAt).getTime();
  const destinationTime = Date.now();
  const offset = Number.isFinite(sourceTime) ? destinationTime - sourceTime : 0;
  const shift = (value: string) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time)
      ? new Date(time + offset).toISOString()
      : new Date(destinationTime).toISOString();
  };
  for (const collection of [
    state.orders,
    state.queue,
    state.serviceRequests,
    state.movements,
    state.auditLog,
  ]) {
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
  for (const order of state.orders) {
    order.timeline = order.timeline.map((event) => ({
      ...event,
      createdAt: shift(event.createdAt),
    }));
  }
  state.restaurant.lastOpenedAt = shift(state.restaurant.lastOpenedAt);
  if (state.restaurant.lastClosedAt) {
    state.restaurant.lastClosedAt = shift(state.restaurant.lastClosedAt);
  }
  state.updatedAt = new Date(destinationTime).toISOString();
  return state;
}

function freshSeedState() {
  return rebaseLiveTimestamps(structuredClone(seedState));
}

async function getDatabase(): Promise<D1DatabaseLike | null> {
  if (process.env.FLOWDINE_LOCAL === "1") return null;
  const workers = await import("cloudflare:workers");
  return (workers.env as unknown as { DB: D1DatabaseLike }).DB;
}

function localState() {
  globalThis.__flowDineLocalState ??= freshSeedState();
  globalThis.__flowDineLocalVersion ??= 1;
  return globalThis.__flowDineLocalState;
}

async function ensureStore() {
  const database = await getDatabase();
  if (!database) return null;
  await ensureNormalizedSchema(database);
  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS rate_limits (
        bucket_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      )`,
    )
    .run();
  return database;
}

export async function readState(): Promise<AppState> {
  const database = await ensureStore();
  if (!database) return structuredClone(localState());
  const { state } = await readNormalizedState(database);
  const updatedAt = new Date(state.updatedAt).getTime();
  if (!Number.isFinite(updatedAt) || updatedAt < Date.now() - 365 * 24 * 60 * 60 * 1_000) {
    const repaired = rebaseLiveTimestamps(state);
    const current = await readNormalizedState(database);
    const written = await writeNormalizedState(database, repaired, current.version);
    if (!written) throw new Error("Restaurant state changed while timestamps were repaired.");
    return repaired;
  }
  return state;
}

export async function updateState(
  _actorRole: string,
  _actionName: string,
  updater: (state: AppState) => { state: AppState; message: string },
) {
  const database = await ensureStore();
  if (!database) {
    const result = updater(structuredClone(localState()));
    globalThis.__flowDineLocalState = result.state;
    globalThis.__flowDineLocalVersion = (globalThis.__flowDineLocalVersion ?? 1) + 1;
    return result;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readNormalizedState(database);
    const result = updater(current.state);
    if (await writeNormalizedState(database, result.state, current.version)) {
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
    globalThis.__flowDineLocalVersion = 1;
    globalThis.__flowDineLocalRateLimits = new Map();
    return fresh;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readNormalizedState(database);
    if (await writeNormalizedState(database, fresh, current.version)) return fresh;
  }
  throw new Error("Restaurant state changed while the test state was reset.");
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
