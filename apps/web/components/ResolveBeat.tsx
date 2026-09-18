"use client";

import { motion } from "framer-motion";
import { SystemWindow } from "./SystemWindow";

export interface ResolveOverlayState {
  lines: string[];
  anomaly: boolean;
  assertive: boolean;
  holding: boolean;
}

/**
 * System result of the tap, on the current still. Short, then the next room
 * replaces it in one cut — this window is not a loading gate.
 */
export function ResolveOverlay({
  beat,
}: {
  beat: ResolveOverlayState;
}) {
  return (
    <motion.div
      className={`absolute inset-0 z-20 flex flex-col justify-center p-4 ${
        beat.holding ? "resolve-hold" : ""
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="resolve-scrim pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 w-full max-w-[94%]">
        <SystemWindow
          lines={beat.lines}
          anomaly={beat.anomaly}
          assertive={beat.assertive}
        />
      </div>
    </motion.div>
  );
}
