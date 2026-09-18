/**
 * Background work seam. Unique stills are generated here, after the run has
 * already ended — never on the tap path. Until Gemini returns (or if the key
 * is empty), EndingCard keeps using the local death/victory plate.
 */
import { llm } from "./llm/index.js";
import { plateLine } from "./plates.js";
import { saveEpilogue } from "../state/sessionStore.js";

export interface EpilogueJob {
  type: "epilogue_image";
  runId: string;
  userId: string;
  outcome: "death" | "victory";
  prompt: string;
}

export type Job = EpilogueJob;

export interface JobQueue {
  publish(job: Job): Promise<void>;
  artKeyFor(outcome: "death" | "victory"): string;
}

const EPILOGUE_ART: Record<"death" | "victory", string> = {
  death: "ending.death",
  victory: "ending.victory",
};

function stillPrompt(job: EpilogueJob): string {
  const plate = plateLine(EPILOGUE_ART[job.outcome]);
  return [
    "Original dark Korean manhwa webtoon still, cinematic lighting, ink and digital paint.",
    "The same original character throughout: a lean exhausted Korean young-adult E-rank hunter, messy black hair, cheap cracked leather chestpiece over a navy hoodie, worn combat boots, tired eyes.",
    "Not a licensed character. No readable text, no logos, no UI, no speech bubbles.",
    plate,
    `Caption of the last panel: ${job.prompt}`,
    job.outcome === "victory"
      ? "Quiet competence. He is walking out. No confetti, no smile."
      : "He has fallen. Unsentimental. The floor is close.",
  ].join(" ");
}

class InProcessQueue implements JobQueue {
  artKeyFor(outcome: "death" | "victory"): string {
    return EPILOGUE_ART[outcome];
  }

  async publish(job: Job): Promise<void> {
    // Deliberately not awaited from the turn: the player already has a still.
    setImmediate(() => {
      void this.dispatch(job);
    });
  }

  private async dispatch(job: Job): Promise<void> {
    try {
      const still = await llm.generateStill?.(stillPrompt(job));
      if (!still) {
        console.info(
          `[queue] epilogue ${job.outcome} kept local plate ${this.artKeyFor(job.outcome)} for run ${job.runId}`,
        );
        return;
      }
      await saveEpilogue(job.runId, still);
      console.info(`[queue] epilogue still stored for run ${job.runId}`);
    } catch (error) {
      console.warn(
        `[queue] epilogue failed for ${job.runId}: ${(error as Error).message}`,
      );
    }
  }
}

export const jobQueue: JobQueue = new InProcessQueue();
