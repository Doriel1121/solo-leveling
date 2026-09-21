import type { HunterRank, RunOutcome, RunType } from "@system/shared";
import { pool } from "../pool.js";

export interface RunRecord {
  id: string;
  userId: string;
  runType: RunType;
  outcome: RunOutcome;
}

/** Active runs with no tap for this long are treated as quits. */
export const STALE_ACTIVE_HOURS = 24;

export async function createRun(
  userId: string,
  runType: RunType,
  location = "awakening",
): Promise<RunRecord> {
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    run_type: RunType;
    outcome: RunOutcome;
  }>(
    `INSERT INTO runs (user_id, run_type, last_location)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, run_type, outcome`,
    [userId, runType, location],
  );
  const row = rows[0]!;
  return {
    id: row.id,
    userId: row.user_id,
    runType: row.run_type,
    outcome: row.outcome,
  };
}

/** Promotes a run to 'anomaly' the first time it is diverted off the canon path. */
export async function markRunType(
  runId: string,
  runType: RunType,
): Promise<void> {
  await pool.query("UPDATE runs SET run_type = $2 WHERE id = $1", [
    runId,
    runType,
  ]);
}

/** Writes how far an active run has gotten so a quit is not stored as step 0. */
export async function progressRun(params: {
  runId: string;
  steps: number;
  location: string;
}): Promise<void> {
  await pool.query(
    `UPDATE runs
        SET steps = $2,
            last_location = $3,
            last_step_at = now()
      WHERE id = $1
        AND outcome = 'active'`,
    [params.runId, params.steps, params.location],
  );
}

export async function finishRun(params: {
  runId: string;
  outcome: Exclude<RunOutcome, "active">;
  deathReason: string | null;
  steps: number;
  location: string;
  finalLevel: number;
  finalRank: HunterRank;
  canonDivergence: number;
}): Promise<void> {
  await pool.query(
    `UPDATE runs
       SET outcome = $2,
           end_time = now(),
           death_reason = $3,
           steps = $4,
           last_location = $5,
           last_step_at = now(),
           final_level = $6,
           final_rank = $7,
           canon_divergence = $8
     WHERE id = $1
       AND outcome = 'active'`,
    [
      params.runId,
      params.outcome,
      params.deathReason,
      params.steps,
      params.location,
      params.finalLevel,
      params.finalRank,
      params.canonDivergence,
    ],
  );
}

/** Marks a live run abandoned. Keeps the last persisted step — Redis meta can lag. */
export async function abandonRun(
  runId: string,
  reason = "Player left the raid.",
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE runs
        SET outcome = 'abandoned',
            end_time = now(),
            death_reason = $2
      WHERE id = $1
        AND outcome = 'active'`,
    [runId, reason],
  );
  return (rowCount ?? 0) > 0;
}

/** Closes leftover actives so closing a tab does not look like they are still playing. */
export async function abandonStaleRuns(
  idleHours = STALE_ACTIVE_HOURS,
): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE runs
        SET outcome = 'abandoned',
            end_time = now(),
            death_reason = 'Timed out with no tap.'
      WHERE outcome = 'active'
        AND last_step_at < now() - ($1::int * interval '1 hour')`,
    [idleHours],
  );
  return rowCount ?? 0;
}

export interface GlobalStats {
  totalRuns: number;
  deaths: number;
  victories: number;
  abandoned: number;
  anomalyRuns: number;
  avgSteps: number;
  uniquePlayers: number;
  activeRuns: number;
  runsToday: number;
  playersToday: number;
}

export interface RecentPlayer {
  username: string;
  totalRuns: number;
  highestRank: string;
  createdAt: string;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const { rows } = await pool.query<{
    total_runs: string;
    deaths: string;
    victories: string;
    abandoned: string;
    anomaly_runs: string;
    avg_steps: string | null;
    unique_players: string;
    active_runs: string;
    runs_today: string;
    players_today: string;
  }>(
    `SELECT
       (SELECT count(*) FROM runs)                                          AS total_runs,
       (SELECT count(*) FROM runs WHERE outcome = 'death')                  AS deaths,
       (SELECT count(*) FROM runs WHERE outcome = 'victory')                AS victories,
       (SELECT count(*) FROM runs WHERE outcome = 'abandoned')              AS abandoned,
       (SELECT count(*) FROM runs WHERE run_type = 'anomaly')               AS anomaly_runs,
       (SELECT avg(steps) FROM runs WHERE outcome <> 'active')              AS avg_steps,
       (SELECT count(*) FROM users)                                         AS unique_players,
       (SELECT count(*) FROM runs WHERE outcome = 'active')                 AS active_runs,
       (SELECT count(*) FROM runs WHERE start_time > now() - interval '1 day')  AS runs_today,
       (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day') AS players_today`,
  );
  const row = rows[0]!;
  return {
    totalRuns: Number(row.total_runs),
    deaths: Number(row.deaths),
    victories: Number(row.victories),
    abandoned: Number(row.abandoned),
    anomalyRuns: Number(row.anomaly_runs),
    avgSteps: row.avg_steps ? Number(Number(row.avg_steps).toFixed(1)) : 0,
    uniquePlayers: Number(row.unique_players),
    activeRuns: Number(row.active_runs),
    runsToday: Number(row.runs_today),
    playersToday: Number(row.players_today),
  };
}

export async function listRecentPlayers(limit = 25): Promise<RecentPlayer[]> {
  const { rows } = await pool.query<{
    username: string;
    total_runs: number;
    highest_rank: string;
    created_at: Date;
  }>(
    `SELECT username, total_runs, highest_rank, created_at
       FROM users
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map((row) => ({
    username: row.username,
    totalRuns: row.total_runs,
    highestRank: row.highest_rank,
    createdAt: row.created_at.toISOString(),
  }));
}
