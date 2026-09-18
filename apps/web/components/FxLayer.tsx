"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FxId } from "@system/shared";
import { playSfx } from "@/lib/sfx";
import { isPreemptive } from "@/lib/fx";

/**
 * Screen-wide effects. Panel-local ones (slash, vignette, snow) live inside the
 * art stage; this layer is only for the things that take over the screen.
 *
 * Never interactive, always above the HUD.
 */

const MOTES = Array.from({ length: 14 }, (_, i) => ({
  left: `${8 + ((i * 61) % 84)}%`,
  top: `${40 + ((i * 37) % 45)}%`,
  delay: `${((i * 80) % 700) / 1000}s`,
}));

/** Milliseconds of vibration per effect. Death is felt, not queued. */
const HAPTICS: Partial<Record<FxId, number>> = {
  confirm: 10,
  fail_hit: 30,
  fail_deadly: 30,
  item_acquire: 20,
  level_up: 40,
  death: 50,
};

export function FxLayer({
  fx,
  /** Bumped on every batch so an identical effect still replays. */
  token,
  muted,
}: {
  fx: FxId[];
  token: number;
  muted: boolean;
}) {
  const [takeover, setTakeover] = useState<FxId | null>(null);
  const [rankFlash, setRankFlash] = useState(false);
  const [itemFlash, setItemFlash] = useState(false);

  useEffect(() => {
    const preemptive = fx.find(isPreemptive) ?? null;
    setTakeover(preemptive);

    // Death and victory hold until the player restarts; only the level-up
    // takeover clears itself.
    if (preemptive !== "level_up") return;
    const timer = window.setTimeout(() => setTakeover(null), 900);
    return () => window.clearTimeout(timer);
  }, [fx, token]);

  useEffect(() => {
    if (!fx.includes("rank_up") || fx.some(isPreemptive)) {
      setRankFlash(false);
      return;
    }
    setRankFlash(true);
    const timer = window.setTimeout(() => setRankFlash(false), 500);
    return () => window.clearTimeout(timer);
  }, [fx, token]);

  useEffect(() => {
    if (!fx.includes("item_acquire") || fx.some(isPreemptive)) {
      setItemFlash(false);
      return;
    }
    setItemFlash(true);
    const timer = window.setTimeout(() => setItemFlash(false), 720);
    return () => window.clearTimeout(timer);
  }, [fx, token]);

  useEffect(() => {
    // Sound is opt-in. Haptics still fire — they are the tap, not a soundtrack.
    if (typeof navigator.vibrate === "function") {
      const strongest = Math.max(0, ...fx.map((id) => HAPTICS[id] ?? 0));
      if (strongest > 0) navigator.vibrate(strongest);
    }
    if (muted || !fx.length) return;
    playSfx(fx);
  }, [fx, token, muted]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {takeover === "level_up" && (
          <motion.div
            key={`levelup-${token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 grid place-items-center bg-[#04060d]/55"
          >
            <div className="fx-rings" aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <p className="system-window rounded-sm px-6 py-4 font-system text-[15px] tracking-[0.2em] text-[#bfe9ff] neon-text">
              [ Level up. ]
            </p>
          </motion.div>
        )}

        {itemFlash && (
          <motion.div
            key={`item-${token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 grid place-items-center"
          >
            <div className="fx-item-glow" aria-hidden />
          </motion.div>
        )}

        {rankFlash && (
          <motion.div
            key={`rankup-${token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 grid place-items-center"
          >
            <p className="system-window rounded-sm px-5 py-3 font-system text-[13px] tracking-[0.22em] text-[#bfe9ff] neon-text">
              [ Rank re-evaluated. ]
            </p>
          </motion.div>
        )}

        {takeover === "death" && (
          <motion.div
            key={`death-${token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <div className="fx-desat" aria-hidden />
          </motion.div>
        )}

        {takeover === "victory" && (
          <motion.div
            key={`victory-${token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {/* Quiet competence. No confetti. */}
            <div className="fx-motes" aria-hidden>
              {MOTES.map((mote, i) => (
                <span
                  key={i}
                  style={{
                    left: mote.left,
                    top: mote.top,
                    animationDelay: mote.delay,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
