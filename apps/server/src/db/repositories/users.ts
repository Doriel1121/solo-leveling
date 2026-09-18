import type { HunterRank } from "@system/shared";
import { rankIndex } from "@system/shared";
import { pool } from "../pool.js";

export interface UserRecord {
  id: string;
  username: string;
  totalRuns: number;
  highestRank: HunterRank;
}

interface UserRow {
  id: string;
  username: string;
  total_runs: number;
  highest_rank: HunterRank;
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    totalRuns: row.total_runs,
    highestRank: row.highest_rank,
  };
}

/** Idempotent: repeat logins with the same handle resume the same account. */
export async function findOrCreateUser(username: string): Promise<UserRecord> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (username)
     VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username, total_runs, highest_rank`,
    [username],
  );
  return toRecord(rows[0]!);
}

export async function incrementRunCount(userId: string): Promise<void> {
  await pool.query(
    "UPDATE users SET total_runs = total_runs + 1 WHERE id = $1",
    [userId],
  );
}

/** Only writes when the new rank is actually higher, so it is safe to call often. */
export async function promoteHighestRank(
  userId: string,
  rank: HunterRank,
): Promise<void> {
  const { rows } = await pool.query<{ highest_rank: HunterRank }>(
    "SELECT highest_rank FROM users WHERE id = $1",
    [userId],
  );
  const current = rows[0]?.highest_rank;
  if (!current || rankIndex(rank) > rankIndex(current)) {
    await pool.query("UPDATE users SET highest_rank = $2 WHERE id = $1", [
      userId,
      rank,
    ]);
  }
}
