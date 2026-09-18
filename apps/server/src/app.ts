import cors from "@fastify/cors";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { env, isProd } from "./env.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./routes/sessions.js";
import { statsRoutes } from "./routes/stats.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: isProd ? "info" : "debug" },
    // Render terminates TLS and forwards the client IP in X-Forwarded-For.
    trustProxy: isProd,
  });

  await app.register(cors, {
    // Render's `fromService` wiring yields a bare hostname; accept both forms.
    origin: env.CORS_ORIGIN.split(",")
      .map((value) => value.trim().replace(/\/+$/, ""))
      .filter(Boolean)
      .map((value) => (/^https?:\/\//.test(value) ? value : `https://${value}`)),
    methods: ["GET", "POST", "OPTIONS"],
  });

  await app.register(healthRoutes);
  await app.register(sessionRoutes, { prefix: "/api" });
  await app.register(statsRoutes, { prefix: "/api" });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "unhandled request error");
    reply.code(error.statusCode ?? 500).send({
      error: isProd ? "Internal server error" : error.message,
    });
  });

  return app;
}
