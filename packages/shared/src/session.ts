import type { Choice, Panel } from "./panels.js";
import type { PlayerStats } from "./stats.js";

export type RunType = "canon" | "anomaly";
export type RunOutcome = "active" | "death" | "victory" | "abandoned";

/** One entry of the rolling context window fed back into the model. */
export interface ContextEntry {
  step: number;
  /** What the player did, in a few words. */
  action: string;
  /** What came of it, compressed to one sentence. */
  outcome: string;
  nodeId: string;
}

export interface SessionSnapshot {
  sessionId: string;
  runId: string;
  userId: string;
  stats: PlayerStats;
  inventory: string[];
  step: number;
  runType: RunType;
  outcome: RunOutcome;
  location: string;
  /** True once a Job Change option was taken this run. */
  jobChanged?: boolean;
  panels: Panel[];
  choices: Choice[];
}

export interface CreateSessionRequest {
  username?: string;
}

export interface CreateSessionResponse {
  session: SessionSnapshot;
}

export interface TurnRequest {
  choiceId: string;
}
