import type { FastifyPluginAsync } from "fastify";
import { activeProvider, env, liveProviderChain } from "../env.js";
import { pool } from "../db/pool.js";
import { redis } from "../state/redis.js";

function modelFor(name: "gemini" | "cohere"): string {
  return name === "gemini" ? env.GEMINI_MODEL : env.COHERE_MODEL;
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness only — must not touch dependencies, or a Redis blip restarts the service.
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async (_request, reply) => {
    const [db, cache] = await Promise.allSettled([
      pool.query("SELECT 1"),
      redis.ping(),
    ]);

    const chain = liveProviderChain();
    const ready = db.status === "fulfilled" && cache.status === "fulfilled";
    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ready" : "degraded",
      postgres: db.status === "fulfilled" ? "up" : "down",
      redis: cache.status === "fulfilled" ? "up" : "down",
      llmProvider: chain.join("+") || "mock",
      model:
        chain.length === 0
          ? "offline-mock"
          : chain.map(modelFor).join(" then "),
      primary: activeProvider,
    });
  });
};
