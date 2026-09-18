import type { HunterRank, RunOutcome, RunType } from "@system/shared";
import { pool } from "../pool.js";

export interface RunRecord {
  id: string;
  userId: string;
  runType: RunType;
  outcome: RunOutcome;
}

export async function createRun(
  userId: string,
  runType: RunType,
): Promise<RunRecord> {
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    run_type: RunType;
    outcome: RunOutcome;
  }>(
    `INSERT INTO runs (user_id, run_type)
     VALUES ($1, $2)
     RETURNING id, user_id, run_type, outcome`,
    [userId, runType],
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

export async function finishRun(params: {
  runId: string;
  outcome: Exclude<RunOutcome, "active">;
  deathReason: string | null;
  steps: number;
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
           final_level = $5,
           final_rank = $6,
           canon_divergence = $7
     WHERE id = $1`,
    [
      params.runId,
      params.outcome,
      params.deathReason,
      params.steps,
      params.finalLevel,
      params.finalRank,
      params.canonDivergence,
    ],
  );
}

export interface GlobalStats {
  totalRuns: number;
  deaths: number;
  victories: number;
  anomalyRuns: number;
  avgSteps: number;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const { rows } = await pool.query<{
    total_runs: string;
    deaths: string;
    victories: string;
    anomaly_runs: string;
    avg_steps: string | null;
  }>(
    `SELECT count(*)                                            AS total_runs,
            count(*) FILTER (WHERE outcome = 'death')           AS deaths,
            count(*) FILTER (WHERE outcome = 'victory')         AS victories,
            count(*) FILTER (WHERE run_type = 'anomaly')        AS anomaly_runs,
            avg(steps) FILTER (WHERE outcome <> 'active')       AS avg_steps
       FROM runs`,
  );
  const row = rows[0]!;
  return {
    totalRuns: Number(row.total_runs),
    deaths: Number(row.deaths),
    victories: Number(row.victories),
    anomalyRuns: Number(row.anomaly_runs),
    avgSteps: row.avg_steps ? Number(Number(row.avg_steps).toFixed(1)) : 0,
  };
}
