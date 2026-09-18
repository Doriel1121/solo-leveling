import type { Choice, ContextEntry, Panel, PlayerStats } from "@system/shared";
import { env } from "../env.js";
import type { GeneratedChoice, SessionMeta } from "../engine/types.js";
import { keys, sessionKeys } from "./keys.js";
import { redis } from "./redis.js";

const TTL = env.SESSION_TTL_SECONDS;
const PANEL_HISTORY = 40;

/** Speculative narration for a candidate choice, produced during read time. */
export interface PrefetchedTurn {
  choiceId: string;
  caption: string;
  narration: string;
  choices: GeneratedChoice[];
  /**
   * World conditions the speculation assumed. If the run has since diverged —
   * a collision diverted it into a red gate, say — the cached panel describes a
   * world that no longer exists and must be discarded.
   */
  assumedStep: number;
  assumedRedGate: boolean;
  createdAt: number;
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function createSession(
  meta: SessionMeta,
  stats: PlayerStats,
  inventory: string[],
): Promise<void> {
  const pipeline = redis.multi();
  pipeline.set(keys.meta(meta.sessionId), JSON.stringify(meta), "EX", TTL);
  pipeline.set(keys.stats(meta.sessionId), JSON.stringify(stats), "EX", TTL);
  if (inventory.length) {
    pipeline.sadd(keys.inventory(meta.sessionId), ...inventory);
    pipeline.expire(keys.inventory(meta.sessionId), TTL);
  }
  pipeline.incr(keys.totalRuns);
  await pipeline.exec();
}

/** Slides the 24h window forward on every interaction. */
export async function touchSession(sessionId: string): Promise<void> {
  const pipeline = redis.multi();
  for (const key of sessionKeys(sessionId)) pipeline.expire(key, TTL);
  await pipeline.exec();
}

export async function getMeta(sessionId: string): Promise<SessionMeta | null> {
  return parse<SessionMeta>(await redis.get(keys.meta(sessionId)));
}

export async function saveMeta(meta: SessionMeta): Promise<void> {
  await redis.set(keys.meta(meta.sessionId), JSON.stringify(meta), "EX", TTL);
}

export async function getStats(sessionId: string): Promise<PlayerStats | null> {
  return parse<PlayerStats>(await redis.get(keys.stats(sessionId)));
}

export async function saveStats(
  sessionId: string,
  stats: PlayerStats,
): Promise<void> {
  await redis.set(keys.stats(sessionId), JSON.stringify(stats), "EX", TTL);
}

/** Rolling memory window handed to the model to keep narration continuous. */
export async function pushContext(
  sessionId: string,
  entry: ContextEntry,
): Promise<void> {
  const key = keys.context(sessionId);
  const pipeline = redis.multi();
  pipeline.lpush(key, JSON.stringify(entry));
  pipeline.ltrim(key, 0, env.CONTEXT_WINDOW - 1);
  pipeline.expire(key, TTL);
  await pipeline.exec();
}

/** Oldest first, which is the order the prompt wants. */
export async function getContext(sessionId: string): Promise<ContextEntry[]> {
  const raw = await redis.lrange(keys.context(sessionId), 0, env.CONTEXT_WINDOW - 1);
  return raw
    .map((item) => parse<ContextEntry>(item))
    .filter((item): item is ContextEntry => item !== null)
    .reverse();
}

export async function getInventory(sessionId: string): Promise<string[]> {
  return redis.smembers(keys.inventory(sessionId));
}

export async function addItems(
  sessionId: string,
  items: string[],
): Promise<void> {
  if (!items.length) return;
  const pipeline = redis.multi();
  pipeline.sadd(keys.inventory(sessionId), ...items);
  pipeline.expire(keys.inventory(sessionId), TTL);
  await pipeline.exec();
}

export async function removeItem(
  sessionId: string,
  item: string,
): Promise<void> {
  await redis.srem(keys.inventory(sessionId), item);
}

export async function pushPanel(
  sessionId: string,
  panel: Panel,
): Promise<void> {
  const key = keys.panels(sessionId);
  const pipeline = redis.multi();
  pipeline.rpush(key, JSON.stringify(panel));
  pipeline.ltrim(key, -PANEL_HISTORY, -1);
  pipeline.expire(key, TTL);
  await pipeline.exec();
}

export async function getPanels(sessionId: string): Promise<Panel[]> {
  const raw = await redis.lrange(keys.panels(sessionId), 0, -1);
  return raw
    .map((item) => parse<Panel>(item))
    .filter((item): item is Panel => item !== null);
}

export async function saveChoices(
  sessionId: string,
  choices: Choice[],
): Promise<void> {
  await redis.set(keys.choices(sessionId), JSON.stringify(choices), "EX", TTL);
}

export async function getChoices(sessionId: string): Promise<Choice[]> {
  return parse<Choice[]>(await redis.get(keys.choices(sessionId))) ?? [];
}

export async function markNodeSeen(
  sessionId: string,
  nodeId: string,
): Promise<void> {
  const pipeline = redis.multi();
  pipeline.sadd(keys.seenNodes(sessionId), nodeId);
  pipeline.expire(keys.seenNodes(sessionId), TTL);
  await pipeline.exec();
}

export async function getSeenNodes(sessionId: string): Promise<string[]> {
  return redis.smembers(keys.seenNodes(sessionId));
}

/**
 * Prefetched turns get a short TTL of their own: they are only useful until the
 * player picks something, and stale ones would describe a world that moved on.
 */
export async function savePrefetch(
  sessionId: string,
  turn: PrefetchedTurn,
): Promise<void> {
  await redis.set(
    keys.prefetch(sessionId, turn.choiceId),
    JSON.stringify(turn),
    "EX",
    300,
  );
}

/** Reads and deletes in one round trip so a prefetch can never be replayed. */
export async function takePrefetch(
  sessionId: string,
  choiceId: string,
): Promise<PrefetchedTurn | null> {
  const key = keys.prefetch(sessionId, choiceId);
  const raw = await redis.getdel(key);
  return parse<PrefetchedTurn>(raw);
}

export async function dropPrefetches(
  sessionId: string,
  choiceIds: string[],
): Promise<void> {
  if (!choiceIds.length) return;
  await redis.del(...choiceIds.map((id) => keys.prefetch(sessionId, id)));
}

export async function saveEpilogue(
  runId: string,
  still: { mime: string; bytes: Buffer },
): Promise<void> {
  await redis.set(
    keys.epilogue(runId),
    JSON.stringify({ mime: still.mime, b64: still.bytes.toString("base64") }),
    "EX",
    TTL,
  );
}

export async function getEpilogue(
  runId: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const parsed = parse<{ mime: string; b64: string }>(
    await redis.get(keys.epilogue(runId)),
  );
  if (!parsed?.b64) return null;
  return {
    mime: parsed.mime || "image/png",
    bytes: Buffer.from(parsed.b64, "base64"),
  };
}
