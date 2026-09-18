import { runMigrations } from "./migrate.js";
import { pool } from "./pool.js";
import { seedStaticNodes } from "./seed.js";

try {
  await runMigrations();
  const count = await seedStaticNodes();
  console.log(`Seeded ${count} static nodes.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
