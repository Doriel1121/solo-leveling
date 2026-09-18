"use client";

import { motion } from "framer-motion";

/**
 * The System's voice. Deliberately flat and bracketed — it is an interface, not
 * a character, so it gets no prose styling and no animation beyond its arrival.
 *
 * It is diegetic HUD: it overlays the artwork rather than sitting in a bubble
 * beside it, because it is exactly what the Player is looking at.
 */
export function SystemWindow({
  lines,
  anomaly = false,
  assertive = false,
}: {
  lines: string[];
  anomaly?: boolean;
  /** Death has to interrupt a screen reader rather than wait its turn. */
  assertive?: boolean;
}) {
  if (!lines.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`system-window system-scan rounded-sm px-3.5 py-3 ${
        anomaly ? "system-window--anomaly" : ""
      }`}
      role="status"
      aria-live={assertive ? "assertive" : "polite"}
    >
      <ul className="space-y-1 font-system text-[12.5px] leading-relaxed tracking-tight">
        {lines.map((line, index) => (
          <motion.li
            key={`${index}-${line}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, duration: 0.2 }}
            className={anomaly ? "text-[#ffb3c1]" : "neon-text text-[#bfe9ff]"}
          >
            {line}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
