"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/**
 * The first ten seconds are an invitation, not a briefing.
 *
 * One System window that is already open, a name field, and one action. The
 * architecture, the routing, and the anomaly are not explained here — a player
 * who cares will meet a Red Gate.
 */
export function StartScreen({
  starting,
  error,
  onStart,
}: {
  starting: boolean;
  error: string | null;
  onStart: (username: string) => void;
}) {
  const [username, setUsername] = useState("");

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center overflow-hidden px-6 py-16">
      {/* A tear in the air, breathing. */}
      <div
        aria-hidden
        className="gate-tear pointer-events-none absolute left-1/2 top-[22%] h-[38vh] w-[52vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(38% 50% at 50% 50%, rgba(96,150,255,0.5), rgba(40,60,150,0.16) 58%, transparent 76%)",
          filter: "blur(2px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative space-y-9"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="system-window system-scan rounded-sm px-4 py-4"
        >
          <p className="neon-text font-system text-[13.5px] leading-relaxed tracking-tight text-[#cfeeff]">
            [ You have acquired the qualification to be a Player. ]
          </p>
          <p className="mt-1.5 font-system text-[13.5px] leading-relaxed tracking-tight text-[#8fc7e6]">
            [ Class: None — Title: None ]
          </p>
        </motion.div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!starting) onStart(username);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block font-system text-[10px] uppercase tracking-widest text-white/40">
              hunter designation
            </span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={32}
              placeholder="assigned if empty"
              className="w-full rounded-sm border border-white/15 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-[#4cc9ff]/60"
            />
          </label>

          <button
            type="submit"
            disabled={starting}
            style={{ minHeight: "var(--choice-min-height)" }}
            className="system-window w-full rounded-sm px-4 py-3 transition-transform hover:-translate-y-px disabled:opacity-50"
          >
            <span className="block font-system text-[13px] uppercase tracking-[0.24em] text-[#cfeeff]">
              {starting ? "opening" : "accept"}
            </span>
            <span className="mt-0.5 block font-system text-[9.5px] uppercase tracking-[0.28em] text-white/35">
              enter the gate
            </span>
          </button>

          <p className="text-center text-[13px] text-white/35">
            Only you can see this window.
          </p>

          {error && (
            <p className="font-system text-[11px] text-[#ff9fb0]">{error}</p>
          )}
        </form>
      </motion.div>
    </main>
  );
}
