"use client";

import { useState, type ReactNode } from "react";
import type { FxId, PanelVisual } from "@system/shared";
import { artSrc, hasPaintedPlate, plateClass } from "@/lib/fx";

/**
 * The art stage: a biome plate, a mood grade, and any panel-local effects,
 * with the System window and caption layered on top.
 *
 * The plate is CSS, so it is already painted when the panel mounts. A still
 * layers over the matching gradient when one exists; when it does not — or when
 * it 404s — the gradient is the artwork, never an empty grey box.
 */

/** Deterministic so the server and client render the same particles. */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  delay: `${((i * 370) % 4200) / 1000}s`,
  duration: `${(4200 + ((i * 233) % 3000)) / 1000}s`,
  drift: `${((i % 5) - 2) * 11}px`,
}));

function Particles({ kind }: { kind: "snow" | "dust" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden fx-${kind}`} aria-hidden>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            // Consumed by the fx-fall keyframes.
            ["--drift" as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}

interface PanelArtProps {
  visual: PanelVisual;
  fx: FxId[];
  /** Plays once per mount; a replayed panel in the scroll stays still. */
  animate?: boolean;
  children?: ReactNode;
  onTap?: () => void;
  /** Optional overlay (blob URL). Used only for the end-of-run still. */
  stillSrc?: string;
}

export function PanelArt({
  visual,
  fx,
  animate = true,
  children,
  onTap,
  stillSrc,
}: PanelArtProps) {
  const active = new Set(fx);
  const live = (id: FxId) => animate && active.has(id);

  const shake = live("fail_deadly")
    ? "fx-shake-heavy"
    : live("fail_hit") || live("collapse")
      ? "fx-shake-light"
      : "";

  const snowing = active.has("red_seal") || visual.mood === "ice";
  const still = artSrc(visual.artKey);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const painted = loadedSrc === still || Boolean(stillSrc);

  return (
    <div
      className={`panel-stage mood-${visual.mood} shot-${visual.shot} ${shake} ${
        painted ? "has-still" : ""
      }`}
      onClick={onTap}
    >
      <div
        className={`plate plate-graded ${plateClass(visual.artKey)}`}
        aria-hidden
      />

      <img
        key={still}
        src={still}
        alt=""
        aria-hidden
        className="plate z-[1] h-full w-full object-cover object-top"
        onLoad={() => setLoadedSrc(still)}
        onError={(event) => {
          const img = event.currentTarget;
          const fallback = "/art/dungeon.pillar.png";
          if (!img.src.endsWith("dungeon.pillar.png")) {
            img.src = fallback;
            return;
          }
          img.style.display = "none";
          setLoadedSrc(null);
        }}
      />

      {stillSrc && (
        <img
          src={stillSrc}
          alt=""
          aria-hidden
          className="plate plate-epilogue z-[1] h-full w-full object-cover object-top"
        />
      )}

      <div className="plate-tint z-[2]" aria-hidden />
      <div className="plate-grain z-[2]" aria-hidden />
      <div className="plate-scrim z-[2]" aria-hidden />

      {snowing && <Particles kind="snow" />}
      {active.has("collapse") && <Particles kind="dust" />}
      {active.has("anomaly_bed") && !hasPaintedPlate(visual.artKey) && (
        <div className="fx-anomaly-bed" aria-hidden />
      )}

      {live("strike") && <div className="fx-slash" aria-hidden />}
      {live("strike_heavy") && (
        <>
          <div className="fx-slash" aria-hidden />
          <div className="fx-slash opacity-60 mix-blend-screen" aria-hidden />
        </>
      )}
      {live("fail_hit") && <div className="fx-vignette" aria-hidden />}
      {live("fail_deadly") && (
        <div className="fx-vignette fx-vignette--long" aria-hidden />
      )}
      {(live("safe_recover") || live("rest")) && (
        <div className="fx-wash-warm" aria-hidden />
      )}
      {live("red_seal") && <div className="fx-seal" aria-hidden />}

      {children}
    </div>
  );
}
