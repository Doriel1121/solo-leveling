/**
 * Dev harness: plays a full run against a live server and prints a compact
 * trace of each turn. Two runs launched with the same strategy will walk the
 * same path, which is how the anti-collision Red Gate divert gets exercised.
 *
 *   npm run play -w @system/server -- [first|last|random] [maxTurns] [readMs]
 *
 * `readMs` simulates the time a human spends reading a panel. Set it to 0 to
 * see worst-case latency, or to a realistic 5000 to see the speculative cache
 * absorb the model call entirely.
 */
import type { Choice, ServerEvent } from "@system/shared";

const API = process.env.API_URL ?? "http://localhost:4000";
const strategy = (process.argv[2] ?? "first") as
  | "first"
  | "last"
  | "random"
  | "cautious"
  | "smart";
const maxTurns = Number(process.argv[3] ?? 14);
const readMs = Number(process.argv[4] ?? 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RISK_ORDER = { safe: 0, moderate: 1, deadly: 2 } as const;

function pickChoice(
  choices: Choice[],
  hpRatio: number,
  level: number,
): Choice | null {
  const open = choices.filter((choice) => !choice.locked);
  if (!open.length) return null;

  if (strategy === "random") {
    return open[Math.floor(Math.random() * open.length)]!;
  }
  if (strategy === "cautious") {
    return [...open].sort(
      (a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk],
    )[0]!;
  }
  if (strategy === "smart") {
    // Heal when hurt; otherwise escalate risk only as competence catches up,
    // which is the play pattern the XP decay curve is meant to reward.
    const target: keyof typeof RISK_ORDER =
      hpRatio < 0.5 ? "safe" : level >= 5 ? "deadly" : level >= 3 ? "moderate" : "safe";
    return [...open].sort(
      (a, b) =>
        Math.abs(RISK_ORDER[a.risk] - RISK_ORDER[target]) -
        Math.abs(RISK_ORDER[b.risk] - RISK_ORDER[target]),
    )[0]!;
  }
  return strategy === "last" ? open[open.length - 1]! : open[0]!;
}

async function* readEvents(response: Response): AsyncGenerator<ServerEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (line) yield JSON.parse(line.slice(5).trim()) as ServerEvent;
      boundary = buffer.indexOf("\n\n");
    }
  }
}

const created = await fetch(`${API}/api/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
if (!created.ok) throw new Error(`session create failed: ${created.status}`);

const { session } = (await created.json()) as {
  session: {
    sessionId: string;
    choices: Choice[];
    panels: { source: string; text?: string; visual?: { caption?: string } }[];
  };
};

const opening = session.panels[0];
console.log(`run ${session.sessionId}  strategy=${strategy}`);
console.log(`  opening panel from ${opening?.source}`);
console.log(`  opening caption: "${opening?.visual?.caption ?? ""}"`);
console.log(`  opening body: "${(opening?.text ?? "").slice(0, 96)}"`);
if (!opening?.visual?.caption?.trim() && !opening?.text?.trim()) {
  console.log("  MUTE OPENING — no caption and no body");
}

console.log("");

let choices = session.choices;
let lockedSeen = 0;
let prefetchHits = 0;
let muteCount = 0;
let turns = 0;
let hpRatio = 1;
let level = 1;

for (let turn = 1; turn <= maxTurns; turn += 1) {
  // The window the speculative engine is designed to exploit.
  if (readMs > 0) await sleep(readMs);

  const choice = pickChoice(choices, hpRatio, level);
  if (!choice) {
    console.log("no affordable option remains — run stalls");
    break;
  }
  lockedSeen += choices.filter((c) => c.locked).length;

  const started = Date.now();
  const response = await fetch(
    `${API}/api/sessions/${session.sessionId}/turn`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choiceId: choice.id }),
    },
  );

  let firstByteAt = 0;
  let source = "?";
  let kind = "?";
  let caption = "";
  let narration = "";
  const system: string[] = [];
  let ended: string | null = null;
  let hit = false;
  let statLine = "";

  for await (const event of readEvents(response)) {
    switch (event.type) {
      case "panel_start":
        source = event.source;
        kind = event.kind;
        caption = event.caption ?? "";
        break;
      case "caption":
        caption = event.caption;
        break;
      case "resolve":
      case "system":
        system.push(...event.lines);
        break;
      case "narration":
        if (!firstByteAt) firstByteAt = Date.now() - started;
        narration += event.delta;
        break;
      case "stats":
        hpRatio = event.stats.hp / event.stats.maxHp;
        level = event.stats.level;
        statLine = `HP ${event.stats.hp}/${event.stats.maxHp} MP ${event.stats.mp} FAT ${Math.round(event.stats.fatigue)} LV ${event.stats.level}${event.stats.rank}  DIV ${event.stats.canonDivergence.toFixed(1)}%`;
        break;
      case "choices":
        choices = event.choices;
        break;
      case "run_end":
        ended = `${event.outcome}: ${event.reason}`;
        break;
      case "done":
        hit = event.prefetchHit;
        if (hit) prefetchHits += 1;
        break;
      case "error":
        ended = `error: ${event.message}`;
        break;
    }
  }

  turns = turn;
  const total = Date.now() - started;
  console.log(
    `${String(turn).padStart(2)}. "${choice.label}" [${choice.risk}]`,
  );
  console.log(
    `    ${kind}/${source}${hit ? " (prefetched)" : ""}  ttfb ${firstByteAt}ms  total ${total}ms`,
  );
  if (system.length) console.log(`    ${system.join("  ")}`);
  console.log(`    ${statLine}`);
  const mute = !caption.trim() && !narration.trim();
  console.log(`    caption: "${caption.slice(0, 80)}${caption.length > 80 ? "…" : ""}"`);
  console.log(`    body: "${narration.slice(0, 96)}${narration.length > 96 ? "…" : ""}"`);
  if (mute) {
    console.log("    MUTE PANEL — no caption and no body");
    muteCount += 1;
  }

  if (ended) {
    console.log(`\n  ${ended}`);
    break;
  }
}

console.log(
  `\nturns=${turns}  prefetchHits=${prefetchHits}/${turns}  lockedOptionsShown=${lockedSeen}  mutePanels=${muteCount}`,
);
