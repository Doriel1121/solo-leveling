import { Redis } from "ioredis";
import { env } from "../env.js";
import { MemoryCache } from "./memoryCache.js";

export type Cache = Redis | MemoryCache;

export const usingMemoryCache = !env.REDIS_URL;

/**
 * Render Hobby allows one free Key Value instance per workspace. When that
 * slot is already taken — or REDIS_URL is unset — sessions live in process
 * memory. Free Key Value does not persist either, so this matches the plan.
 *
 * ioredis enables TLS automatically for rediss:// URLs, which is what Render
 * Key Value hands out when the URL is present.
 */
export const redis: Cache = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
  : new MemoryCache();

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
