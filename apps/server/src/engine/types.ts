import type {
  ChoiceRequirement,
  FxId,
  HunterRank,
  PanelKind,
  PanelSource,
  PanelVisual,
  RiskLevel,
  RunOutcome,
  RunType,
  StatDelta,
} from "@system/shared";

/** A choice before live stats decide whether it is locked. */
export interface GeneratedChoice {
  id: string;
  label: string;
  detail?: string;
  requires: ChoiceRequirement;
  risk: RiskLevel;
  grant?: string;
}

/** Narration plus follow-up choices for one panel, from either source. */
export interface GeneratedPanel {
  kind: PanelKind;
  source: PanelSource;
  systemLines: string[];
  caption: string;
  text: string;
  choices: GeneratedChoice[];
}

/**
 * Deterministic result of a choice, computed before any text exists. The model
 * narrates this outcome; it never decides it. That keeps the rules authoritative
 * and makes runs reproducible from the seed.
 */
export interface TurnOutcome {
  kind: PanelKind;
  deltas: StatDelta[];
  systemLines: string[];
  /** One-line mechanical summary handed to the narrator as ground truth. */
  summary: string;
  /**
   * Effects the client should play. Stamped here rather than by the model,
   * because the resolver is the only thing that knows success, risk, and death.
   */
  fx: FxId[];
  terminal: "death" | "victory" | null;
  roll: number;
  difficulty: number;
  success: boolean;
  leveledUp: boolean;
  rankChanged: boolean;
  granted: string[];
  jobChanged: boolean;
}

export interface SessionMeta {
  sessionId: string;
  runId: string;
  userId: string;
  step: number;
  runType: RunType;
  outcome: RunOutcome;
  location: string;
  /**
   * Steps remaining before the red gate's clear condition is met. Set by the
   * collision detector when a run is diverted; while above zero the router
   * refuses static content and the run cannot return to the surface.
   */
  redGateDepth: number;
  seed: number;
  /** Set when the player accepts a Job Change beat. Drives the shadow palette. */
  jobChanged?: boolean;
}

export interface StaticNodeRecord {
  id: string;
  kind: PanelKind;
  location: string;
  minLevel: number;
  maxLevel: number | null;
  rankGate: HunterRank | null;
  systemLines: string[];
  /** Body prose. Kept inside the text budget; the caption carries the panel. */
  content: string;
  /** Authored art plate, grade, and caption for this scene. */
  visual: PanelVisual;
  options: GeneratedChoice[];
  requiredStats: ChoiceRequirement;
  weight: number;
}
