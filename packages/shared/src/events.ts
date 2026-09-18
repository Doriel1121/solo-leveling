import type {
  Choice,
  FxId,
  PanelKind,
  PanelMood,
  PanelShot,
  PanelSource,
} from "./panels.js";
import type { PlayerStats, StatDelta } from "./stats.js";
import type { RunOutcome, RunType } from "./session.js";

/**
 * Wire contract for the SSE turn stream. The client renders each event as it
 * arrives, which is what removes every loading state from the experience.
 *
 * Order is part of the contract. `stats`, `fx`, and `resolve` land first so the
 * current still can carry the mechanical result of the tap; `panel_start`
 * paints the next room only after that beat; follow-up `system` lines belong
 * to the new scene.
 */
export type ServerEvent =
  | {
      type: "panel_start";
      panelId: string;
      kind: PanelKind;
      source: PanelSource;
      step: number;
      /** Drives the HUD's depth label, which changes as the run descends. */
      location: string;
      /** A run can be diverted into an anomaly mid-stream; the badge must follow. */
      runType: RunType;
      /** Everything needed to paint the frame immediately, minus the caption. */
      artKey: string;
      mood: PanelMood;
      shot: PanelShot;
      /** After Job Change the chrome shifts to the shadow palette. */
      jobChanged?: boolean;
    }
  | {
      /**
       * Mechanical result of the action just taken. The client keeps this on
       * the current still so the next room never arrives without its options.
       */
      type: "resolve";
      lines: string[];
      anomaly?: boolean;
      assertive?: boolean;
    }
  | { type: "caption"; panelId: string; caption: string }
  | { type: "fx"; panelId: string; fx: FxId[] }
  | { type: "system"; panelId: string; lines: string[] }
  | { type: "narration"; panelId: string; delta: string }
  | {
      type: "stats";
      stats: PlayerStats;
      deltas: StatDelta[];
      inventory?: string[];
    }
  | { type: "choices"; panelId: string; choices: Choice[] }
  | {
      type: "run_end";
      outcome: Exclude<RunOutcome, "active">;
      reason: string;
      epilogueArtKey?: string;
    }
  | { type: "error"; message: string }
  | {
      type: "done";
      panelId: string;
      /** Wall-clock time the turn took server-side, for the debug overlay. */
      latencyMs: number;
      /** True when the narration came from the speculative cache. */
      prefetchHit: boolean;
    };

export type ServerEventType = ServerEvent["type"];

export function encodeSSE(event: ServerEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
