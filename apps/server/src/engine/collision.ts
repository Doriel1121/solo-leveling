import { env } from "../env.js";
import { keys } from "../state/keys.js";
import { redis } from "../state/redis.js";

export interface CollisionVerdict {
  /** Share of the recent path other runs have already walked, 0-1. */
  overlap: number;
  /** True when the path is well-trodden enough to divert into a Red Gate. */
  divert: boolean;
  stepsCompared: number;
}

export interface CollisionDetector {
  /** Appends one step to this run's trail and returns its verdict. */
  step(sessionId: string, signature: string): Promise<CollisionVerdict>;
}

/** Runs shorter than this always overlap — everyone starts in the same place. */
const MIN_STEPS_BEFORE_DIVERT = 4;
const TRAIL_LENGTH = 5;

function hash(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const combined =
    (((h1 ^ (h1 >>> 16)) >>> 0) * 4294967296 + ((h2 ^ (h2 >>> 13)) >>> 0));
  return combined.toString(36);
}

/** Collapses a step into a comparable identity: where you were, what you did. */
export function stepSignature(location: string, choiceLabel: string): string {
  const normalised = choiceLabel
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join("-");
  return `${location}:${normalised}`;
}

/**
 * Path-collision detection over HyperLogLog counters.
 *
 * The PRD calls for a Bloom filter; HyperLogLog is used instead because it is
 * native to stock Redis (RedisBloom is a module, not available on managed
 * instances) and because the question being asked is "how many *distinct* runs
 * walked this path", which is a cardinality query, not a membership one. Memory
 * is capped at ~12KB per counter regardless of player count.
 *
 * For each step we hash the cumulative path so far. Two runs only share a hash
 * if they made the identical sequence of choices from the same locations. The
 * overlap ratio is the share of the last five cumulative paths that at least one
 * other run has also walked.
 */
class RedisPathCollisionDetector implements CollisionDetector {
  async step(
    sessionId: string,
    signature: string,
  ): Promise<CollisionVerdict> {
    const trailKey = keys.pathTrail(sessionId);

    const append = redis.multi();
    append.rpush(trailKey, signature);
    append.ltrim(trailKey, -TRAIL_LENGTH, -1);
    append.expire(trailKey, env.SESSION_TTL_SECONDS);
    await append.exec();

    const trail = await redis.lrange(trailKey, 0, -1);

    // Cumulative path identity at each position in the trail window.
    const pathHashes: string[] = [];
    let acc = "";
    for (const entry of trail) {
      acc = hash(`${acc}|${entry}`);
      pathHashes.push(acc);
    }

    // Count who was here before us, then register ourselves.
    const counts = redis.multi();
    for (const pathHash of pathHashes) counts.pfcount(keys.pathWindow(pathHash));
    const results: [Error | null, unknown][] = (await counts.exec()) ?? [];

    const register = redis.multi();
    for (const pathHash of pathHashes) {
      register.pfadd(keys.pathWindow(pathHash), sessionId);
      register.expire(keys.pathWindow(pathHash), env.SESSION_TTL_SECONDS * 30);
    }
    await register.exec();

    const trodden = results.filter(([error, value]) => {
      if (error) return false;
      return Number(value ?? 0) >= 1;
    }).length;

    const overlap = pathHashes.length ? trodden / pathHashes.length : 0;
    return {
      overlap,
      stepsCompared: pathHashes.length,
      divert:
        pathHashes.length >= MIN_STEPS_BEFORE_DIVERT &&
        overlap > env.COLLISION_THRESHOLD,
    };
  }
}

export const collisionDetector: CollisionDetector =
  new RedisPathCollisionDetector();
