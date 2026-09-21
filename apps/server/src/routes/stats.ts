import type { FastifyPluginAsync } from "fastify";
import {
  abandonStaleRuns,
  getGlobalStats,
  listRecentPlayers,
} from "../db/repositories/runs.js";
import { keys } from "../state/keys.js";
import { redis } from "../state/redis.js";

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/stats", async () => {
    await abandonStaleRuns();
    const [global, recentPlayers, activeSessions] = await Promise.all([
      getGlobalStats(),
      listRecentPlayers(25),
      redis.get(keys.totalRuns),
    ]);
    return {
      ...global,
      sessionsEverStarted: Number(activeSessions ?? 0),
      recentPlayers,
    };
  });
};
