"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  Choice,
  FxId,
  Panel,
  PlayerStats,
  RiskLevel,
  RunType,
  ServerEvent,
  SessionSnapshot,
  StatDelta,
} from "@system/shared";
import { isBlank } from "@system/shared";
import { abandonSession, createSession, fetchSession } from "./api";
import { artSrc, predictFx } from "./fx";
import { streamTurn } from "./sse";

const STORAGE_KEY = "system.sessionId";

/**
 * The client owns typewriter pacing rather than the server. Narration deltas
 * are buffered as they land and revealed at a readable rate, which means a
 * prefetched panel arrives instantly on the wire and still types out — and a
 * tap can complete it, because the whole body is already here.
 */
const REVEAL_TICK_MS = 40;
const REVEAL_CHARS = 4;

/** Short System snap on the current still. Never a loading gate. */
const RESOLVE_BASE_MS = 640;
const RESOLVE_PER_LINE_MS = 90;
const RESOLVE_MAX_MS = 900;
const RESOLVE_REDUCED_MS = 220;

export type FeedItem =
  | { type: "action"; id: string; label: string; risk: RiskLevel }
  | {
      type: "panel";
      id: string;
      panel: Panel;
      streaming: boolean;
      revealed: number;
    };

export type RunStatus = "idle" | "starting" | "ready" | "streaming" | "ended";

export interface Telemetry {
  latencyMs: number;
  prefetchHit: boolean;
}

export interface ResolveBeat {
  lines: string[];
  anomaly: boolean;
  assertive: boolean;
  holding: boolean;
  openedAt: number;
  revealedAt: number;
}

type PanelItem = Extract<FeedItem, { type: "panel" }>;

interface PendingTurn {
  panel: PanelItem | null;
  choices: Choice[];
  choicesReceived: boolean;
  artReady: boolean;
  ending: RunState["ending"];
  echo: { label: string; risk: RiskLevel } | null;
  location?: string;
  runType?: RunType;
  jobChanged?: boolean;
}

interface RunState {
  session: SessionSnapshot | null;
  feed: FeedItem[];
  stats: PlayerStats | null;
  choices: Choice[];
  /** Kept so a failed turn can put the player's options back. */
  shelvedChoices: Choice[];
  deltas: StatDelta[];
  /** Latest effect batch, plus a token so an identical batch still replays. */
  fx: FxId[];
  fxToken: number;
  status: RunStatus;
  ending: { outcome: "death" | "victory" | "abandoned"; reason: string; artKey?: string } | null;
  error: string | null;
  telemetry: Telemetry | null;
  resolve: ResolveBeat | null;
  pending: PendingTurn | null;
  chosenId: string | null;
}

const initialState: RunState = {
  session: null,
  feed: [],
  stats: null,
  choices: [],
  shelvedChoices: [],
  deltas: [],
  fx: [],
  fxToken: 0,
  status: "idle",
  ending: null,
  error: null,
  telemetry: null,
  resolve: null,
  pending: null,
  chosenId: null,
};

type Action =
  | { type: "starting" }
  | { type: "loaded"; session: SessionSnapshot }
  | { type: "failed"; message: string }
  | { type: "acted"; label: string; risk: RiskLevel; fx: FxId[]; now: number; choiceId: string }
  | { type: "event"; event: ServerEvent }
  | { type: "art_ready" }
  | { type: "resolve_hold" }
  | { type: "resolve_tick" }
  | { type: "commit" }
  | { type: "reveal"; chars: number }
  | { type: "reveal_all" }
  | { type: "reset" };

function feedFromPanels(panels: Panel[]): FeedItem[] {
  return panels.map((panel) => ({
    type: "panel" as const,
    id: panel.id,
    panel,
    streaming: false,
    // Replayed history is already read; it does not type itself out again.
    revealed: panel.text.length,
  }));
}

/** Applies a patch to the newest panel in the feed. */
function patchLastPanel(
  feed: FeedItem[],
  patch: (item: PanelItem) => FeedItem,
): FeedItem[] {
  for (let i = feed.length - 1; i >= 0; i -= 1) {
    const item = feed[i]!;
    if (item.type !== "panel") continue;
    const copy = feed.slice();
    copy[i] = patch(item);
    return copy;
  }
  return feed;
}

function patchPendingPanel(
  pending: PendingTurn,
  patch: (item: PanelItem) => PanelItem,
): PendingTurn {
  if (!pending.panel) return pending;
  return { ...pending, panel: patch(pending.panel) };
}

function emptyPending(echo: PendingTurn["echo"] = null): PendingTurn {
  return {
    panel: null,
    choices: [],
    choicesReceived: false,
    artReady: false,
    ending: null,
    echo,
  };
}

function nextReady(pending: PendingTurn | null): boolean {
  if (!pending?.panel) return false;
  if (pending.ending) return true;
  return pending.choicesReceived && pending.artReady;
}

function preloadStill(artKey: string, onReady: () => void): void {
  if (typeof window === "undefined") {
    onReady();
    return;
  }
  const img = new Image();
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    onReady();
  };
  img.onload = done;
  img.onerror = done;
  img.src = artSrc(artKey);
  window.setTimeout(done, 280);
}

function startPanel(event: Extract<ServerEvent, { type: "panel_start" }>): PanelItem {
  return {
    type: "panel",
    id: event.panelId,
    streaming: true,
    revealed: 0,
    panel: {
      id: event.panelId,
      kind: event.kind,
      source: event.source,
      visual: {
        artKey: event.artKey,
        mood: event.mood,
        shot: event.shot,
        caption: event.caption ?? "",
      },
      fx: [],
      text: "",
      systemLines: [],
      createdAt: new Date().toISOString(),
    },
  };
}

function applySessionFromPanel(
  session: SessionSnapshot | null,
  event: Extract<ServerEvent, { type: "panel_start" }>,
): SessionSnapshot | null {
  if (!session) return session;
  return {
    ...session,
    location: event.location,
    runType: event.runType,
    jobChanged: event.jobChanged ?? session.jobChanged,
  };
}

function commitPending(state: RunState): RunState {
  const pending = state.pending;
  if (!pending?.panel) {
    return { ...state, resolve: null, pending: null, chosenId: null };
  }

  const buffered = pending.panel.panel.text.length;
  const panel: PanelItem = {
    ...pending.panel,
    revealed: buffered,
  };

  const session =
    state.session && pending.location
      ? {
          ...state.session,
          location: pending.location,
          runType: pending.runType ?? state.session.runType,
          jobChanged: pending.jobChanged ?? state.session.jobChanged,
        }
      : state.session;

  const sceneFx = panel.panel.fx;
  const ended = pending.ending ?? state.ending;
  const echo = pending.echo
    ? ([
        {
          type: "action" as const,
          id: `act_${state.feed.length}`,
          label: pending.echo.label,
          risk: pending.echo.risk,
        },
      ] satisfies FeedItem[])
    : [];

  return {
    ...state,
    session,
    feed: [...state.feed, ...echo, panel],
    choices: pending.choices,
    shelvedChoices: pending.choices.length ? pending.choices : state.shelvedChoices,
    ending: ended,
    status: ended ? "ended" : panel.streaming ? "streaming" : "ready",
    resolve: null,
    pending: null,
    chosenId: null,
    fx: sceneFx.length ? sceneFx : state.fx,
    fxToken: sceneFx.length ? state.fxToken + 1 : state.fxToken,
  };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "starting":
      return { ...initialState, status: "starting" };

    case "loaded":
      return {
        ...state,
        session: action.session,
        stats: action.session.stats,
        choices: action.session.choices,
        shelvedChoices: action.session.choices,
        feed: feedFromPanels(action.session.panels),
        status: action.session.outcome === "active" ? "ready" : "ended",
        ending:
          action.session.outcome === "active"
            ? null
            : { outcome: action.session.outcome, reason: "This run is over." },
        error: null,
        resolve: null,
        pending: null,
        chosenId: null,
      };

    case "failed":
      return {
        ...state,
        status: state.session ? "ready" : "idle",
        choices: state.session ? state.shelvedChoices : [],
        error: action.message,
        resolve: null,
        pending: null,
        chosenId: null,
      };

    case "acted":
      return {
        ...state,
        status: "streaming",
        error: null,
        deltas: [],
        fx: action.fx,
        fxToken: state.fxToken + 1,
        shelvedChoices: state.choices,
        // Keep the current dock. Replacing it with a temp tile is what jumps.
        chosenId: action.choiceId,
        resolve: null,
        pending: emptyPending({ label: action.label, risk: action.risk }),
      };

    case "art_ready":
      if (!state.pending || state.pending.artReady) return state;
      return { ...state, pending: { ...state.pending, artReady: true } };

    case "resolve_hold":
      if (!state.resolve || state.resolve.holding) return state;
      return { ...state, resolve: { ...state.resolve, holding: true } };

    case "resolve_tick":
      if (!state.pending) return state;
      if (nextReady(state.pending) && state.resolve) return commitPending(state);
      if (state.resolve?.holding) return state;
      if (!state.resolve) return state;
      return { ...state, resolve: { ...state.resolve, holding: true } };

    case "commit":
      if (!state.pending) return state;
      if (!nextReady(state.pending)) return state;
      return commitPending(state);

    case "reveal":
      return {
        ...state,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          revealed: Math.min(
            item.panel.text.length,
            item.revealed + action.chars,
          ),
        })),
      };

    case "reveal_all":
      return {
        ...state,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          revealed: item.panel.text.length,
        })),
      };

    case "reset":
      return initialState;

    case "event":
      return applyEvent(state, action.event);

    default:
      return state;
  }
}

function applyEvent(state: RunState, event: ServerEvent): RunState {
  if (state.pending) {
    return applyBufferedEvent(state, event);
  }
  return applyLiveEvent(state, event);
}

function applyBufferedEvent(state: RunState, event: ServerEvent): RunState {
  const pending = state.pending!;

  switch (event.type) {
    case "resolve":
      return {
        ...state,
        resolve: {
          lines: event.lines.length ? event.lines : ["[ Action registered. ]"],
          anomaly: Boolean(event.anomaly),
          assertive: Boolean(event.assertive),
          holding: false,
          openedAt: state.resolve?.openedAt ?? Date.now(),
          revealedAt: Date.now(),
        },
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: { ...item.panel, systemLines: event.lines },
        })),
      };

    case "panel_start":
      return {
        ...state,
        pending: {
          ...pending,
          panel: startPanel(event),
          location: event.location,
          runType: event.runType,
          jobChanged: event.jobChanged,
          artReady: false,
        },
      };

    case "caption":
      if (isBlank(event.caption)) return state;
      return {
        ...state,
        pending: patchPendingPanel(pending, (item) => ({
          ...item,
          panel: {
            ...item.panel,
            visual: { ...item.panel.visual, caption: event.caption },
          },
        })),
      };

    case "fx":
      if (pending.panel) {
        // Scene entrance lives on the next room; do not replay the strike.
        return {
          ...state,
          pending: patchPendingPanel(pending, (item) => ({
            ...item,
            panel: { ...item.panel, fx: event.fx },
          })),
        };
      }
      return {
        ...state,
        fx: event.fx,
        fxToken: state.fxToken + 1,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: { ...item.panel, fx: event.fx },
        })),
      };

    case "system":
      return {
        ...state,
        pending: patchPendingPanel(pending, (item) => ({
          ...item,
          panel: {
            ...item.panel,
            systemLines: [...item.panel.systemLines, ...event.lines],
          },
        })),
      };

    case "narration":
      return {
        ...state,
        pending: patchPendingPanel(pending, (item) => ({
          ...item,
          panel: { ...item.panel, text: item.panel.text + event.delta },
        })),
      };

    case "stats":
      return applyStats(state, event);

    case "choices":
      return {
        ...state,
        pending: {
          ...pending,
          choices: event.choices,
          choicesReceived: true,
        },
      };

    case "run_end":
      return {
        ...state,
        pending: {
          ...pending,
          ending: {
            outcome: event.outcome,
            reason: event.reason,
            artKey: event.epilogueArtKey,
          },
        },
      };

    case "done":
      return {
        ...state,
        telemetry: { latencyMs: event.latencyMs, prefetchHit: event.prefetchHit },
        pending: {
          ...patchPendingPanel(pending, (item) => ({
            ...item,
            streaming: false,
          })),
          choicesReceived: true,
        },
      };

    case "error":
      return {
        ...state,
        status: "ready",
        choices: state.shelvedChoices,
        error: event.message,
        resolve: null,
        pending: null,
        chosenId: null,
      };

    default:
      return state;
  }
}

function applyStats(
  state: RunState,
  event: Extract<ServerEvent, { type: "stats" }>,
): RunState {
  return {
    ...state,
    stats: event.stats,
    deltas: event.deltas,
    session: state.session
      ? {
          ...state.session,
          stats: event.stats,
          inventory: event.inventory ?? state.session.inventory,
        }
      : state.session,
  };
}

function applyLiveEvent(state: RunState, event: ServerEvent): RunState {
  switch (event.type) {
    case "panel_start":
      return {
        ...state,
        session: applySessionFromPanel(state.session, event),
        feed: [...state.feed, startPanel(event)],
      };

    case "caption":
      if (isBlank(event.caption)) return state;
      return {
        ...state,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: {
            ...item.panel,
            visual: { ...item.panel.visual, caption: event.caption },
          },
        })),
      };

    case "fx":
      return {
        ...state,
        fx: event.fx,
        fxToken: state.fxToken + 1,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: { ...item.panel, fx: event.fx },
        })),
      };

    case "system":
      return {
        ...state,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: {
            ...item.panel,
            systemLines: [...item.panel.systemLines, ...event.lines],
          },
        })),
      };

    case "narration":
      return {
        ...state,
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          panel: { ...item.panel, text: item.panel.text + event.delta },
        })),
      };

    case "stats":
      return applyStats(state, event);

    case "choices":
      return {
        ...state,
        choices: event.choices,
      };

    case "run_end":
      return {
        ...state,
        status: "ended",
        choices: [],
        ending: {
          outcome: event.outcome,
          reason: event.reason,
          artKey: event.epilogueArtKey,
        },
      };

    case "done":
      return {
        ...state,
        status: state.status === "ended" ? "ended" : "ready",
        telemetry: { latencyMs: event.latencyMs, prefetchHit: event.prefetchHit },
        feed: patchLastPanel(state.feed, (item) => ({
          ...item,
          streaming: false,
        })),
      };

    case "error":
      return {
        ...state,
        status: "ready",
        choices: state.shelvedChoices,
        error: event.message,
        resolve: null,
        pending: null,
        chosenId: null,
      };

    default:
      return state;
  }
}

export function resolveDwellMs(lineCount: number, reduced: boolean): number {
  if (reduced) return RESOLVE_REDUCED_MS;
  return Math.min(
    RESOLVE_MAX_MS,
    RESOLVE_BASE_MS + Math.max(1, lineCount) * RESOLVE_PER_LINE_MS,
  );
}

export function useRun() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const rehydrated = useRef(false);
  const lastChoice = useRef<Choice | null>(null);

  // Resume the run in progress after a refresh; Redis holds it for 24h.
  useEffect(() => {
    if (rehydrated.current) return;
    rehydrated.current = true;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    void fetchSession(stored)
      .then((session) => {
        if (session) dispatch({ type: "loaded", session });
        else window.localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => window.localStorage.removeItem(STORAGE_KEY));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const newest = useMemo(() => {
    for (let i = state.feed.length - 1; i >= 0; i -= 1) {
      const item = state.feed[i]!;
      if (item.type === "panel") return item;
    }
    return null;
  }, [state.feed]);

  const typing = Boolean(
    newest && (newest.streaming || newest.revealed < newest.panel.text.length),
  );

  useEffect(() => {
    if (!typing) return;

    // Reduced motion gets the information without the theatre.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      dispatch({ type: "reveal_all" });
      return;
    }

    const timer = window.setInterval(
      () => dispatch({ type: "reveal", chars: REVEAL_CHARS }),
      REVEAL_TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [typing]);

  // One short System snap, then cut to the next room once its art and options
  // are in hand. There is no Acknowledge gate — a hung model cannot hold the tap.
  useEffect(() => {
    const beat = state.resolve;
    const pending = state.pending;
    if (!beat || !pending) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const ready = nextReady(pending);
    const dwell = resolveDwellMs(beat.lines.length, reduced);
    const remaining = beat.revealedAt + dwell - Date.now();

    if (ready && remaining <= 0) {
      dispatch({ type: "commit" });
      return;
    }

    if (!ready && remaining <= 0) {
      if (!beat.holding) dispatch({ type: "resolve_hold" });
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "resolve_tick" });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [state.resolve, state.pending]);

  useEffect(() => {
    const key = state.pending?.panel?.panel.visual.artKey;
    const id = state.pending?.panel?.id;
    if (!key || !id) return;
    let cancelled = false;
    preloadStill(key, () => {
      if (!cancelled) dispatch({ type: "art_ready" });
    });
    return () => {
      cancelled = true;
    };
  }, [state.pending?.panel?.id, state.pending?.panel?.panel.visual.artKey]);

  const start = useCallback(async (username?: string) => {
    dispatch({ type: "starting" });
    try {
      const session = await createSession(username);
      window.localStorage.setItem(STORAGE_KEY, session.sessionId);
      dispatch({ type: "loaded", session });
    } catch (error) {
      dispatch({ type: "failed", message: (error as Error).message });
    }
  }, []);

  const run = useCallback(
    async (sessionId: string, choice: Choice) => {
      lastChoice.current = choice;
      dispatch({
        type: "acted",
        label: choice.label,
        risk: choice.risk,
        fx: predictFx(choice),
        now: Date.now(),
        choiceId: choice.id,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of streamTurn(
          sessionId,
          choice.id,
          controller.signal,
        )) {
          dispatch({ type: "event", event });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        dispatch({ type: "failed", message: (error as Error).message });
      }
    },
    [],
  );

  const choose = useCallback(
    async (choice: Choice) => {
      const sessionId = state.session?.sessionId;
      if (!sessionId || choice.locked || state.status === "streaming") return;
      await run(sessionId, choice);
    },
    [run, state.session?.sessionId, state.status],
  );

  const retry = useCallback(async () => {
    const sessionId = state.session?.sessionId;
    const choice = lastChoice.current;
    if (!sessionId || !choice || state.status === "streaming") return;
    await run(sessionId, choice);
  }, [run, state.session?.sessionId, state.status]);

  const completeText = useCallback(() => dispatch({ type: "reveal_all" }), []);

  const abandon = useCallback(() => {
    abortRef.current?.abort();
    const sessionId = state.session?.sessionId;
    // Death / victory already finished the row. Restart must not overwrite them.
    if (sessionId && !state.ending) {
      void abandonSession(sessionId);
    }
    window.localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "reset" });
  }, [state.session?.sessionId, state.ending]);

  return {
    ...state,
    typing,
    start,
    choose,
    retry,
    completeText,
    abandon,
  };
}
