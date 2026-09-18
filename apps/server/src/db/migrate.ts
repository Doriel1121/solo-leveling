import { pool } from "./pool.js";
import { migrations } from "./migrations.js";

export async function runMigrations(): Promise<string[]> {
  const applied: string[] = [];
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    for (const migration of migrations) {
      const { rowCount } = await client.query(
        "SELECT 1 FROM schema_migrations WHERE id = $1",
        [migration.id],
      );
      if (rowCount) continue;

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
          migration.id,
        ]);
        await client.query("COMMIT");
        applied.push(migration.id);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
  return applied;
}
