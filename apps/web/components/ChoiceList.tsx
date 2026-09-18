"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Choice, ChoiceRequirement, RiskLevel } from "@system/shared";

const RISK_ACCENT: Record<RiskLevel, string> = {
  safe: "#8ea8c3",
  moderate: "#ffb020",
  deadly: "#ff4d6d",
};

/** Risk is a word on the row, not a hover tooltip. Touch devices have no hover. */
const RISK_WORD: Record<RiskLevel, string> = {
  safe: "safe",
  moderate: "risk",
  deadly: "deadly",
};

function requirementChips(requires: ChoiceRequirement): string[] {
  const chips: string[] = [];
  if (requires.mp) chips.push(`${requires.mp} MP`);
  if (requires.hp) chips.push(`${requires.hp} HP`);
  if (requires.level) chips.push(`LV ${requires.level}`);
  if (requires.strength) chips.push(`STR ${requires.strength}`);
  if (requires.agility) chips.push(`AGI ${requires.agility}`);
  if (requires.rank) chips.push(`${requires.rank}-rank`);
  if (requires.item) chips.push(requires.item);
  return chips;
}

/**
 * The thumb dock. Four options, full width, 52px minimum, deadly and locked
 * rows sitting in the same list as everything else — hiding them would be
 * dishonest and they are the reason the list is interesting.
 */
export function ChoiceList({
  choices,
  disabled,
  onChoose,
  onDenied,
  selectedId,
}: {
  choices: Choice[];
  disabled: boolean;
  onChoose: (choice: Choice) => void;
  /** A tap on a sealed row: flash it, do not navigate. */
  onDenied?: (choice: Choice) => void;
  /** The option just taken, kept visible while the next room is assembling. */
  selectedId?: string | null;
}) {
  const [denied, setDenied] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {choices.map((choice) => {
        const accent = RISK_ACCENT[choice.risk];
        const chips = requirementChips(choice.requires);
        const inert = disabled && !choice.locked;
        const selected = selectedId === choice.id;

        return (
          <motion.button
            key={choice.id}
            type="button"
            initial={{ opacity: 0 }}
            animate={{
              opacity: selected ? 1 : inert ? 0.55 : 1,
              // A denied tap answers with a red flash instead of silence.
              boxShadow:
                denied === choice.id
                  ? "inset 0 0 0 1px rgba(255,77,109,0.8)"
                  : selected
                    ? "inset 0 0 0 1px rgba(76,201,255,0.55)"
                    : "inset 0 0 0 0 rgba(255,77,109,0)",
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            whileTap={choice.locked || disabled ? undefined : { scale: 0.99 }}
            onClick={() => {
              if (disabled) return;
              if (choice.locked) {
                setDenied(choice.id);
                window.setTimeout(() => setDenied(null), 160);
                onDenied?.(choice);
                return;
              }
              onChoose(choice);
            }}
            // Locked rows stay focusable so the reason can be read out.
            aria-disabled={choice.locked || disabled}
            className={`group relative flex w-full items-center overflow-hidden rounded-sm border px-4 py-3 text-left transition-colors duration-200 ${
              choice.locked
                ? "border-white/10 bg-white/[0.015]"
                : "system-window"
            } ${inert ? "cursor-wait opacity-80" : ""}`}
            style={{
              minHeight: "var(--choice-min-height)",
              borderLeft: `2px solid ${choice.locked ? "rgba(255,255,255,0.12)" : accent}`,
              // A sealed option should still look hot. This is the FOMO.
              boxShadow: choice.locked
                ? `inset 0 0 18px ${accent}22`
                : undefined,
            }}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              {choice.locked && (
                <span
                  aria-hidden
                  className="lock-glyph mt-[3px] shrink-0 text-white/45"
                />
              )}

              <div className="min-w-0 flex-1">
                <div
                  className={`text-[14.5px] font-medium leading-snug ${
                    choice.locked ? "text-white/45" : "text-[#e8f4ff]"
                  }`}
                >
                  {choice.label}
                </div>

                {choice.detail && (
                  <div className="mt-0.5 font-system text-[11px] leading-snug text-white/35">
                    {choice.detail}
                  </div>
                )}

                {(chips.length > 0 || choice.lockReason) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className={`rounded-sm border px-1.5 py-0.5 font-system text-[9.5px] uppercase tracking-widest ${
                          choice.locked
                            ? "border-[#ff4d6d]/30 text-[#ff9fb0]/70"
                            : "border-white/15 text-white/45"
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                    {choice.locked && choice.lockReason && (
                      <span className="font-system text-[9.5px] uppercase tracking-widest text-white/30">
                        {choice.lockReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <span
              className="ml-2 shrink-0 self-start pt-1 font-system text-[9px] uppercase tracking-[0.18em]"
              style={{ color: accent, opacity: choice.locked ? 0.4 : 0.75 }}
            >
              {RISK_WORD[choice.risk]}
            </span>
          </motion.button>
        );
      })}
    </AnimatePresence>
  );
}
