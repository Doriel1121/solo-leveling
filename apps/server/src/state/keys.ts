/**
 * Every key the service touches, in one place. Session keys share the
 * `session:{id}:*` prefix so a whole run can be expired or dropped as a unit.
 */
export const keys = {
  meta: (id: string) => `session:${id}:meta`,
  stats: (id: string) => `session:${id}:stats`,
  context: (id: string) => `session:${id}:context`,
  inventory: (id: string) => `session:${id}:inventory`,
  panels: (id: string) => `session:${id}:panels`,
  choices: (id: string) => `session:${id}:choices`,
  seenNodes: (id: string) => `session:${id}:seen`,
  /** Speculative outcome for one candidate choice, written while the user reads. */
  prefetch: (id: string, choiceId: string) => `session:${id}:prefetch:${choiceId}`,
  pathTrail: (id: string) => `session:${id}:trail`,
  /** End-of-run generated still. Lives with the run, not the live session. */
  epilogue: (runId: string) => `run:${runId}:epilogue`,

  /** How many distinct runs have walked a given 5-step window. */
  pathWindow: (windowHash: string) => `global:paths:window:${windowHash}`,
  totalRuns: "global:runs:total",
} as const;

/** All per-session keys, for TTL refresh and teardown. */
export function sessionKeys(id: string): string[] {
  return [
    keys.meta(id),
    keys.stats(id),
    keys.context(id),
    keys.inventory(id),
    keys.panels(id),
    keys.choices(id),
    keys.seenNodes(id),
    keys.pathTrail(id),
  ];
}
