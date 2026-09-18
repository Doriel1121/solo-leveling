"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { HunterRank, PlayerStats, RunType, StatDelta } from "@system/shared";
import { xpForNextLevel } from "@system/shared";
import { locationLabel } from "@/lib/locationLabels";

function Bar({
  label,
  value,
  max,
  tone,
  warn = false,
  slam = false,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
  warn?: boolean;
  slam?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-baseline justify-between font-system text-[10px] uppercase tracking-widest text-white/45">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">
          {Math.round(value)}
          <span className="text-white/30">/{max}</span>
        </span>
      </div>
      <div
        className={`bar-track h-1.5 w-full overflow-hidden rounded-full ${
          warn ? "pulse-warn" : ""
        }`}
      >
        <motion.div
          className={`h-full rounded-full ${slam ? "bar-slam" : ""}`}
          style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        />
      </div>
    </div>
  );
}

const DELTA_LABEL: Record<string, string> = {
  hp: "HP",
  mp: "MP",
  fatigue: "FATIGUE",
  xp: "EXP",
  strength: "STR",
  agility: "AGI",
  canonDivergence: "DIVERGENCE",
};

/**
 * The rank chip is the glow-up meter, and the most designed 40px in the app.
 * E is deliberately dim and small; S is a black chip with a cyan rim that
 * breathes. The player should be able to feel progress without reading a number.
 */
const RANK_CHIP: Record<HunterRank, string> = {
  E: "border-white/20 bg-white/[0.03] text-white/55 text-[10px]",
  D: "border-[#8ea8c3]/50 bg-[#8ea8c3]/10 text-[#cfdcea] text-[10.5px]",
  C: "border-[#4cc9ff]/40 bg-[#0b3a5c]/40 text-[#bfe9ff] text-[11px]",
  B: "border-[#ffb020]/55 bg-[#ffb020]/10 text-[#ffdca0] text-[11px]",
  A: "border-white/60 bg-white/[0.06] text-white text-[11.5px]",
  S: "border-[#4cc9ff]/80 bg-black text-[#dff4ff] text-[12px] rank-breathe",
};

export function StatusHeader({
  stats,
  deltas,
  runType,
  location,
  step,
  inventory,
  muted,
  onToggleMute,
  onAbandon,
}: {
  stats: PlayerStats;
  deltas: StatDelta[];
  runType: RunType;
  location: string;
  step: number;
  inventory?: string[];
  muted: boolean;
  onToggleMute: () => void;
  onAbandon: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const xpNeeded = xpForNextLevel(stats.level);

  // About to die, said without a tutorial.
  const critical = stats.hp / Math.max(stats.maxHp, 1) < 0.25;
  const hpHit = deltas.some((delta) => delta.stat === "hp" && delta.value < 0);

  return (
    <header
      className={`sticky top-0 z-30 border-b border-white/10 bg-[#04060d]/85 backdrop-blur-md ${
        critical ? "pulse-danger" : ""
      }`}
    >
      <div className="mx-auto max-w-[680px] px-4 pb-2.5 pt-3">
        <div className="mb-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={`${stats.rank}-rank, level ${stats.level}. Open character sheet.`}
            className={`flex items-center gap-2 rounded-sm border px-2 py-1 font-system tracking-widest transition-all duration-300 ${
              RANK_CHIP[stats.rank]
            }`}
          >
            <span className={stats.rank === "E" ? "" : "neon-text"}>
              {stats.rank}-RANK
            </span>
            <span className="text-white/35">|</span>
            <span>LV {stats.level}</span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              className="text-[9px] text-white/50"
            >
              ▾
            </motion.span>
          </button>

          <div className="ml-auto flex items-center gap-2 font-system text-[10px] uppercase tracking-widest">
            {runType === "anomaly" && (
              <span className="rounded-sm border border-[#ff2d55]/60 px-1.5 py-0.5 text-[#ff8fa3]">
                anomaly
              </span>
            )}
            <span className="text-white/35">{locationLabel(location)}</span>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <Bar
            label="HP"
            value={stats.hp}
            max={stats.maxHp}
            tone="#ff4d6d"
            warn={critical}
            slam={hpHit}
          />
          <Bar label="MP" value={stats.mp} max={stats.maxMp} tone="#4cc9ff" />
          <Bar
            label="Fatigue"
            value={stats.fatigue}
            max={100}
            tone="#ffb020"
            warn={stats.fatigue > 70}
          />
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-system text-[11px] sm:grid-cols-4">
                <Stat label="STR" value={stats.strength} />
                <Stat label="AGI" value={stats.agility} />
                <Stat label="EXP" value={`${stats.xp}/${xpNeeded}`} />
                <Stat label="STEP" value={step} />
              </dl>

              <div className="mt-3">
                <div className="mb-1 flex justify-between font-system text-[10px] uppercase tracking-widest text-white/45">
                  <span>Canon divergence</span>
                  <span className="tabular-nums text-white/70">
                    {stats.canonDivergence.toFixed(1)}%
                  </span>
                </div>
                <div className="bar-track h-1 w-full overflow-hidden rounded-full">
                  <motion.div
                    className="h-full rounded-full bg-[#c77dff]"
                    style={{ boxShadow: "0 0 8px #c77dff" }}
                    animate={{
                      width: `${Math.min(100, stats.canonDivergence)}%`,
                    }}
                  />
                </div>
              </div>

              {inventory && inventory.length > 0 && (
                <p className="mt-3 font-system text-[10px] uppercase tracking-widest text-[#ffe7a8]/65">
                  [ Carrying: {inventory.join(" · ")} ]
                </p>
              )}

              <div className="mt-3 flex items-center gap-4 font-system text-[10px] uppercase tracking-widest">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={muted}
                  className="text-white/35 transition-colors hover:text-white/70"
                >
                  {muted ? "sound off" : "sound on"}
                </button>

                {confirming ? (
                  <span className="flex items-center gap-3">
                    <span className="text-[#ff8fa3]">abandon run?</span>
                    <button
                      type="button"
                      onClick={onAbandon}
                      className="text-[#ff8fa3] underline decoration-dotted"
                    >
                      yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="text-white/40 underline decoration-dotted"
                    >
                      no
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="text-white/35 underline decoration-dotted transition-colors hover:text-[#ff8fa3]"
                  >
                    abandon run
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating deltas from the turn that just resolved. */}
      <div className="pointer-events-none absolute right-4 top-full flex flex-col items-end gap-0.5 pt-1">
        <AnimatePresence>
          {deltas
            .filter((delta) => delta.value !== 0)
            .map((delta) => (
              <motion.span
                key={`${delta.stat}-${delta.value}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.4 }}
                className={`font-system text-[11px] tabular-nums ${
                  delta.stat === "xp"
                    ? "text-[#ffb020]"
                    : delta.value > 0
                      ? "text-[#7dffa8]"
                      : "text-[#ff8fa3]"
                }`}
              >
                {DELTA_LABEL[delta.stat] ?? delta.stat}{" "}
                {delta.value > 0 ? "+" : ""}
                {Number(delta.value.toFixed(1))}
              </motion.span>
            ))}
        </AnimatePresence>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 pb-1">
      <dt className="uppercase tracking-widest text-white/40">{label}</dt>
      <dd className="tabular-nums text-white/80">{value}</dd>
    </div>
  );
}
