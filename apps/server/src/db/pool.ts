import { Pool } from "pg";
import { env, isProd } from "../env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Render's managed Postgres terminates TLS with a cert the default trust store rejects.
  ssl: isProd ? { rejectUnauthorized: false } : undefined,
});

export async function closePool(): Promise<void> {
  await pool.end();
}
