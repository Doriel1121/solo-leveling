"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChoiceList } from "@/components/ChoiceList";
import { EndingCard } from "@/components/EndingCard";
import { FxLayer } from "@/components/FxLayer";
import { ActionEcho, PanelCard } from "@/components/PanelCard";
import { StartScreen } from "@/components/StartScreen";
import { StatusHeader } from "@/components/StatusHeader";
import { type FeedItem, useRun } from "@/lib/useRun";
import { unlockSfx } from "@/lib/sfx";

const DEBUG_KEY = "system.debug";
const MUTE_KEY = "system.muted";
const HINT_KEY = "system.hinted";

function panelsSeen(feed: FeedItem[]): number {
  return feed.filter((item) => item.type === "panel").length;
}

export default function Page() {
  const run = useRun();
  // Diagnostics are a developer tool. They never ship on: `authored` in the
  // middle of a comic breaks the fiction on the very first panel.
  const [diagnostics, setDiagnostics] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDiagnostics(
      params.get("debug") === "1" ||
        window.localStorage.getItem(DEBUG_KEY) === "1",
    );
    setMuted(window.localStorage.getItem(MUTE_KEY) !== "0");
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const newestRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const followLock = useRef(false);
  const prevFeedLen = useRef(0);
  // The dock floats over the feed, so the feed has to end above it or the
  // newest panel — the one the player is meant to be looking at — is covered.
  const [dockHeight, setDockHeight] = useState(0);

  const dockOpen =
    run.choices.length > 0 ||
    (run.status === "streaming" && !run.ending);

  useEffect(() => {
    const node = dockRef.current;
    if (!node) {
      setDockHeight(0);
      return;
    }
    const measure = () => {
      setDockHeight(node.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [dockOpen]);

  // Ignore the scroll events we cause ourselves so a new panel does not
  // immediately look like the reader scrolled away.
  useEffect(() => {
    const onScroll = () => {
      if (followLock.current) return;
      const distance =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      stickToBottom.current = distance < 180;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lastPanel = [...run.feed].reverse().find((item) => item.type === "panel");
  const growth = lastPanel?.type === "panel" ? lastPanel.revealed : 0;

  useEffect(() => {
    const grew = run.feed.length > prevFeedLen.current;
    prevFeedLen.current = run.feed.length;

    const bringNewestOnScreen = () => {
      const node = newestRef.current ?? bottomRef.current;
      if (!node) return;
      followLock.current = true;
      stickToBottom.current = true;
      const headerOffset = 96;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const dockReserve = mobile ? dockHeight : 0;
      const stage = node.querySelector(".panel-stage") ?? node;
      const stageBox = stage.getBoundingClientRect();
      const stageTop = stageBox.top + window.scrollY;
      const stageBottom = stageTop + stageBox.height;
      // Pin under the HUD, then slide down if the caption would sit under
      // the sticky choice dock.
      let top = stageTop - headerOffset;
      if (dockReserve > 0) {
        top = Math.max(
          top,
          stageBottom - window.innerHeight + dockReserve + 10,
        );
      }
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      window.setTimeout(() => {
        followLock.current = false;
      }, 480);
    };

    // A new panel after a choice always takes the viewport. Streaming growth
    // only follows if the reader is still at the live edge.
    if (grew || (stickToBottom.current && (growth > 0 || run.choices.length))) {
      const frame = window.requestAnimationFrame(bringNewestOnScreen);
      return () => window.cancelAnimationFrame(frame);
    }
  }, [run.feed.length, growth, run.choices.length, dockHeight]);

  // The tutorial is the first three panels, not a modal. One ghost hint on the
  // very first set of options, then never again.
  const firstTurn = run.status === "ready" && panelsSeen(run.feed) === 1;
  useEffect(() => {
    if (!firstTurn) return;
    if (window.localStorage.getItem(HINT_KEY) === "1") return;
    window.localStorage.setItem(HINT_KEY, "1");
    setHint(true);
    const timer = window.setTimeout(() => setHint(false), 2000);
    return () => window.clearTimeout(timer);
  }, [firstTurn]);

  if (!run.session) {
    return (
      <StartScreen
        starting={run.status === "starting"}
        error={run.error}
        onStart={(username) => void run.start(username)}
      />
    );
  }

  const streaming = run.status === "streaming";
  const panelCount = panelsSeen(run.feed);

  return (
    <div className="min-h-dvh">
      <FxLayer fx={run.fx} token={run.fxToken} muted={muted} />
      {run.session.runType === "anomaly" && (
        <div
          className="pointer-events-none fixed inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, transparent 72%, rgba(255, 45, 85, 0.08) 100%)",
          }}
          aria-hidden
        />
      )}
      {run.session.jobChanged && (
        <div className="fx-shadow-bed pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      )}

      {run.stats && (
        <StatusHeader
          stats={run.stats}
          deltas={run.deltas}
          runType={run.session.runType}
          location={run.session.location}
          step={panelCount}
          inventory={run.session.inventory}
          muted={muted}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
            if (!next) unlockSfx();
          }}
          onAbandon={run.abandon}
        />
      )}

      <main
        className="relative z-10 mx-auto max-w-[680px] px-4 pt-5 pb-8 max-md:pb-[var(--dock-pad)]"
        style={{
          ["--dock-pad" as string]: dockHeight
            ? `${dockHeight + 12}px`
            : "2rem",
        }}
      >
        <div className="space-y-4">
          {run.feed.map((item) => {
            const isLivePanel =
              item.type === "panel" && lastPanel?.id === item.id;
            return (
              <div key={item.id} ref={isLivePanel ? newestRef : undefined}>
                {item.type === "action" ? (
                  <ActionEcho label={item.label} risk={item.risk} />
                ) : (
                  <PanelCard
                    panel={item.panel}
                    streaming={item.streaming}
                    revealed={item.revealed}
                    onSkip={run.completeText}
                    resolve={isLivePanel ? run.resolve : null}
                  />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {run.error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 flex items-center justify-between gap-3 rounded-sm border border-[#ff4d6d]/40 bg-[#ff4d6d]/5 px-3 py-2"
            >
              <p className="font-system text-[11px] text-[#ff9fb0]">
                {run.error}
              </p>
              <button
                type="button"
                onClick={() => void run.retry()}
                className="shrink-0 font-system text-[9.5px] uppercase tracking-[0.2em] text-[#ff9fb0]/70 underline decoration-dotted transition-colors hover:text-[#ff9fb0]"
              >
                retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {run.ending && (
          <div className="mt-7">
            <EndingCard
              outcome={run.ending.outcome}
              reason={run.ending.reason}
              stats={run.stats}
              runType={run.session.runType}
              steps={panelCount}
              artKey={run.ending.artKey}
              runId={run.session.runId}
              onRestart={run.abandon}
            />
          </div>
        )}

        {diagnostics && (
          <footer className="mt-8 flex items-center justify-between font-system text-[9.5px] uppercase tracking-[0.18em] text-white/20">
            <button
              type="button"
              onClick={() => {
                setDiagnostics(false);
                window.localStorage.removeItem(DEBUG_KEY);
              }}
              className="transition-colors hover:text-white/45"
            >
              diagnostics on
            </button>

            {run.telemetry && (
              <span>
                {lastPanel?.type === "panel" ? `${lastPanel.panel.source} · ` : ""}
                {run.telemetry.latencyMs} ms
                {run.telemetry.prefetchHit ? " · prefetch hit" : " · live"}
              </span>
            )}
          </footer>
        )}

        <div ref={bottomRef} className="h-px" />
      </main>

      {/* The thumb dock. Sticky on phones with the latest art still visible
          through the fade above it. After a tap the current options stay put
          (inert) so the dock does not jump; the next set fades in in place. */}
      {dockOpen && (
        <div
          ref={dockRef}
          className="z-20 mt-6 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:mt-0"
        >
          <div
            aria-hidden
            className="pointer-events-none hidden h-8 bg-gradient-to-t from-[#04060d] to-transparent max-md:block"
          />
          <div
            className="mx-auto max-w-[680px] space-y-2 bg-[#04060d]/92 px-4 backdrop-blur-sm max-md:max-h-[36vh] max-md:overflow-y-auto"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
            }}
          >
            {/* A cyan System line, never a spinner. */}
            <div className="h-px overflow-hidden">
              {streaming && (
                <motion.div
                  className="h-px bg-[#4cc9ff]"
                  initial={{ width: "0%", opacity: 0.4 }}
                  animate={{ width: "100%", opacity: 1 }}
                  transition={{ duration: 1.65, ease: "easeOut" }}
                />
              )}
            </div>

            {run.choices.length > 0 ? (
              <ChoiceList
                choices={run.choices}
                disabled={streaming}
                selectedId={run.chosenId}
                onChoose={(choice) => void run.choose(choice)}
              />
            ) : null}

            <AnimatePresence>
              {hint && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none text-center font-system text-[9.5px] uppercase tracking-[0.24em] text-[#4cc9ff]/50"
                >
                  tap to act
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
