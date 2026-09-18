import { runMigrations } from "./migrate.js";
import { pool } from "./pool.js";

try {
  const applied = await runMigrations();
  console.log(
    applied.length
      ? `Applied migrations: ${applied.join(", ")}`
      : "Database already up to date.",
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
