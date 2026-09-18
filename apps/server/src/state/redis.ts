import { Redis } from "ioredis";
import { env } from "../env.js";

// ioredis enables TLS automatically for rediss:// URLs, which is what Render
// Key Value hands out.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
