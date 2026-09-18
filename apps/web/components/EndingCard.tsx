"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PanelVisual, PlayerStats, RunType } from "@system/shared";
import { fetchEpilogueBlob } from "@/lib/api";
import { PanelArt } from "./PanelArt";

const STILLS: Record<"death" | "victory" | "abandoned", PanelVisual> = {
  death: {
    artKey: "ending.death",
    mood: "void",
    shot: "bleed",
    caption: "",
  },
  victory: {
    artKey: "ending.victory",
    mood: "aura",
    shot: "bleed",
    caption: "",
  },
  abandoned: {
    artKey: "dungeon.pillar",
    mood: "void",
    shot: "standard",
    caption: "",
  },
};

/** The ending has to land, so nothing is tappable for a beat. */
const SILENCE_MS = 800;

export function EndingCard({
  outcome,
  reason,
  stats,
  runType,
  steps,
  artKey,
  runId,
  onRestart,
}: {
  outcome: "death" | "victory" | "abandoned";
  reason: string;
  stats: PlayerStats | null;
  runType: RunType;
  steps: number;
  artKey?: string;
  runId?: string;
  onRestart: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [generatedSrc, setGeneratedSrc] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SILENCE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!runId || outcome === "abandoned") return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const poll = async () => {
      const url = await fetchEpilogueBlob(runId);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = url;
        setGeneratedSrc(url);
        return;
      }
      attempts += 1;
      if (attempts < 24) {
        timer = window.setTimeout(() => void poll(), 1500);
      }
    };

    timer = window.setTimeout(() => void poll(), 900);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [runId, outcome]);

  const victorious = outcome === "victory";
  const visual = {
    ...STILLS[outcome],
    artKey: artKey || STILLS[outcome].artKey,
  };

  async function shareCard() {
    if (sharing || !stats) return;
    setSharing(true);
    try {
      const blob = await drawShareCard({
        outcome,
        reason,
        rank: stats.rank,
        level: stats.level,
        artKey: visual.artKey,
        stillSrc: generatedSrc,
      });
      const file = new File([blob], "gate.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "The System" });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "gate.png";
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Share cancelled or unsupported — the restart button is still there.
    } finally {
      setSharing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-3"
    >
      <PanelArt visual={visual} fx={[]} stillSrc={generatedSrc ?? undefined}>
        <div className="flex h-full flex-col justify-between p-3">
          <div
            className={`system-window max-w-[92%] rounded-sm px-3.5 py-3 ${
              victorious ? "" : "system-window--anomaly"
            }`}
            role="status"
            aria-live="assertive"
          >
            <p className="font-system text-[12.5px] uppercase tracking-[0.22em] text-white/70">
              {victorious
                ? "[ Gate cleared. ]"
                : outcome === "death"
                  ? "[ You have died. ]"
                  : "[ Run discarded. ]"}
            </p>
          </div>

          {/* One sentence. The engine's mechanical summary never reaches here. */}
          <p className="panel-caption ml-auto max-w-[88%] text-right text-[18px] leading-snug tracking-wide text-white">
            {reason}
          </p>
        </div>
      </PanelArt>

      {stats && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-system text-[10px] uppercase tracking-widest text-white/40">
          <span>
            {stats.rank}-rank<span className="text-white/25"> · </span>lv{" "}
            {stats.level}
          </span>
          <span>{steps} panels</span>
          <span>{stats.canonDivergence.toFixed(1)}% divergence</span>
          {runType === "anomaly" && (
            <span className="text-[#ff8fa3]">anomaly</span>
          )}
        </div>
      )}

      <motion.button
        type="button"
        onClick={onRestart}
        disabled={!ready}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ minHeight: "var(--choice-min-height)" }}
        className="w-full rounded-sm border border-[#4cc9ff]/40 bg-[#0b3a5c]/30 px-4 py-3 font-system text-[11px] uppercase tracking-[0.2em] text-[#bfe9ff] transition-colors hover:border-[#4cc9ff]/80"
      >
        enter a new gate
      </motion.button>

      {ready && (
        <button
          type="button"
          onClick={() => void shareCard()}
          disabled={sharing || !stats}
          className="block w-full text-center font-system text-[9.5px] uppercase tracking-[0.22em] text-white/25 transition-colors hover:text-white/50"
        >
          {sharing ? "binding still" : "share the gate"}
        </button>
      )}

      {/* The run is already above this card — go back to it rather than
          navigating to a summary page. */}
      {ready && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="block w-full text-center font-system text-[9.5px] uppercase tracking-[0.22em] text-white/25 transition-colors hover:text-white/50"
        >
          review the run
        </button>
      )}
    </motion.div>
  );
}

async function drawShareCard(params: {
  outcome: "death" | "victory" | "abandoned";
  reason: string;
  rank: string;
  level: number;
  artKey: string;
  stillSrc?: string | null;
}): Promise<Blob> {
  const width = 720;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.fillStyle = "#04060d";
  ctx.fillRect(0, 0, width, height);

  const still = await loadStill(
    params.stillSrc || `/art/${params.artKey}.png`,
  );
  if (still) {
    const scale = Math.max(width / still.width, (height * 0.72) / still.height);
    const dw = still.width * scale;
    const dh = still.height * scale;
    ctx.drawImage(still, (width - dw) / 2, 0, dw, dh);
  }

  const fade = ctx.createLinearGradient(0, height * 0.45, 0, height);
  fade.addColorStop(0, "rgba(4,6,13,0)");
  fade.addColorStop(1, "rgba(4,6,13,0.96)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, height * 0.4, width, height * 0.6);

  ctx.fillStyle = "#cfeeff";
  ctx.font = "600 22px ui-monospace, monospace";
  ctx.fillText(
    params.outcome === "victory"
      ? "[ GATE CLEARED. ]"
      : params.outcome === "death"
        ? "[ YOU HAVE DIED. ]"
        : "[ RUN DISCARDED. ]",
    36,
    height - 150,
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 28px ui-sans-serif, system-ui, sans-serif";
  wrapText(ctx, params.reason, 36, height - 108, width - 72, 34);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 16px ui-monospace, monospace";
  ctx.fillText(`${params.rank}-RANK  ·  LV ${params.level}`, 36, height - 36);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("blob");
  return blob;
}

function loadStill(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursor);
}
