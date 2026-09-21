import { buildApp } from "./app.js";
import { closePool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { abandonStaleRuns } from "./db/repositories/runs.js";
import { countStaticNodes } from "./db/repositories/staticNodes.js";
import { seedStaticNodes } from "./db/seed.js";
import { activeProvider, env, liveProviderChain } from "./env.js";
import { closeRedis, usingMemoryCache } from "./state/redis.js";

const app = await buildApp();

try {
  const applied = await runMigrations();
  if (applied.length) app.log.info({ applied }, "migrations applied");

  // Authored nodes are the source of truth. Upsert every boot so opening
  // copy and new prologue beats reach an already-seeded database.
  const seeded = await seedStaticNodes();
  app.log.info({ seeded, existing: await countStaticNodes() }, "seeded static nodes");

  const stale = await abandonStaleRuns();
  if (stale) app.log.info({ stale }, "closed stale active runs");

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(
    {
      provider: liveProviderChain().join("+") || "mock",
      primary: activeProvider,
      prefetchFanout: env.PREFETCH_FANOUT,
      cache: usingMemoryCache ? "memory" : "redis",
    },
    "generation engine ready",
  );
} catch (error) {
  app.log.error({ err: error }, "startup failed");
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await Promise.allSettled([closePool(), closeRedis()]);
    process.exit(0);
  });
}
