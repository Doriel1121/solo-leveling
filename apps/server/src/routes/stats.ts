import type { FastifyPluginAsync } from "fastify";
import { getGlobalStats } from "../db/repositories/runs.js";
import { keys } from "../state/keys.js";
import { redis } from "../state/redis.js";

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/stats", async () => {
    const [global, activeSessions] = await Promise.all([
      getGlobalStats(),
      redis.get(keys.totalRuns),
    ]);
    return {
      ...global,
      sessionsEverStarted: Number(activeSessions ?? 0),
    };
  });
};
