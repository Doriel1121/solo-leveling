"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Panel, RiskLevel } from "@system/shared";
import { PanelArt } from "./PanelArt";
import { ResolveOverlay, type ResolveOverlayState } from "./ResolveBeat";
import { SystemWindow } from "./SystemWindow";

/**
 * One webtoon panel: picture first, System second, prose last.
 *
 * The frame is painted the instant the panel mounts, the System window snaps on
 * top of it, and the caption is readable before any body text has arrived. The
 * body is optional — an empty one is the late-game look, not a broken panel.
 */
export function PanelCard({
  panel,
  streaming,
  /** Characters of body prose revealed so far. The client owns the pacing. */
  revealed,
  onSkip,
  resolve,
}: {
  panel: Panel;
  streaming: boolean;
  revealed: number;
  onSkip?: () => void;
  resolve?: ResolveOverlayState | null;
}) {
  const [open, setOpen] = useState(false);
  const anomaly = panel.kind === "red_gate";
  const terminal = panel.kind === "death" || panel.kind === "victory";

  const visible = panel.text.slice(0, revealed);
  const typing = streaming || revealed < panel.text.length;
  // Two lines of body sit in the scroll uncollapsed; anything longer hides
  // behind `read` so the feed stays a comic rather than a wall.
  const long = panel.text.length > 180;
  const body = long && !open && !typing ? `${visible.slice(0, 150).trimEnd()}…` : visible;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-2"
    >
      <PanelArt
        visual={panel.visual}
        fx={panel.fx}
        onTap={typing && !resolve ? onSkip : undefined}
      >
        <div className="relative z-10 flex h-full flex-col justify-between p-3">
          <div className="max-w-[92%]">
            {!resolve && (
              <SystemWindow
                lines={panel.systemLines}
                anomaly={anomaly}
                assertive={panel.kind === "death"}
              />
            )}
          </div>

          {panel.visual.caption && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: resolve ? 0.28 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`panel-caption ml-auto max-w-[88%] text-right leading-snug ${
                terminal || panel.visual.shot === "bleed"
                  ? "text-[18px] tracking-wide text-white"
                  : "text-[16px] text-[#eef4ff]"
              }`}
            >
              {panel.visual.caption}
            </motion.p>
          )}
        </div>

        <AnimatePresence>
          {resolve && <ResolveOverlay key="resolve" beat={resolve} />}
        </AnimatePresence>
      </PanelArt>

      {panel.text && (
        <div
          className={`border-l-2 pl-3.5 ${
            anomaly
              ? "border-[#ff2d55]/50"
              : terminal
                ? "border-white/40"
                : "border-[#4cc9ff]/25"
          }`}
        >
          {/* The accessibility tree always gets the whole body; the collapse is
              a visual affordance only. */}
          <p className="sr-only">{panel.text}</p>
          <p
            aria-hidden
            className={`whitespace-pre-wrap text-[16px] leading-[1.5] text-[#dae4f7] ${
              typing ? "caret" : ""
            } ${terminal ? "text-white" : ""}`}
          >
            {body}
          </p>

          {long && !typing && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="mt-1.5 font-system text-[9.5px] uppercase tracking-[0.2em] text-[#4cc9ff]/60 transition-colors hover:text-[#4cc9ff]"
            >
              {open ? "less" : "read"}
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}

const RISK_TONE: Record<RiskLevel, string> = {
  safe: "border-white/20 text-white/50",
  moderate: "border-[#ffb020]/40 text-[#ffd48a]",
  deadly: "border-[#ff4d6d]/50 text-[#ff9fb0]",
};

/** Echoes the player's own choice back into the feed so the scroll stays legible. */
export function ActionEcho({
  label,
  risk,
}: {
  label: string;
  risk: RiskLevel;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex justify-end"
    >
      <span
        className={`rounded-sm border-r-2 bg-white/[0.03] px-3 py-1.5 text-right font-system text-[11.5px] tracking-wide ${RISK_TONE[risk]}`}
      >
        {label}
      </span>
    </motion.div>
  );
}
