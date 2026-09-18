import { buildApp } from "./app.js";
import { closePool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { countStaticNodes } from "./db/repositories/staticNodes.js";
import { seedStaticNodes } from "./db/seed.js";
import { activeProvider, env, liveProviderChain } from "./env.js";
import { closeRedis } from "./state/redis.js";

const app = await buildApp();

try {
  const applied = await runMigrations();
  if (applied.length) app.log.info({ applied }, "migrations applied");

  // First boot on an empty database should still be playable.
  if ((await countStaticNodes()) === 0) {
    const seeded = await seedStaticNodes();
    app.log.info({ seeded }, "seeded static nodes");
  }

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(
    {
      provider: liveProviderChain().join("+") || "mock",
      primary: activeProvider,
      prefetchFanout: env.PREFETCH_FANOUT,
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
