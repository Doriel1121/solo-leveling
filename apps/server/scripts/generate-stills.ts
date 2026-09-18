/**
 * Batch-paints missing catalogue stills with Gemini Image.
 * Existing PNGs are skipped so this is safe to rerun.
 *
 * Gemini *text* keys usually have no image quota. If generation 429s, stop;
 * do not fall back to a random public image API — those stills will not match.
 *
 *   npm run stills -w @system/server
 *   npx tsx scripts/generate-stills.ts dungeon.strike.aura
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoogleGenAI } from "@google/genai";
import {
  HERO_VARIANT_SCENES,
  PLATE_KEYS,
  isHeroState,
  stillHeroState,
  variantStillKey,
  type HeroState,
} from "@system/shared";
import { plateScene } from "../src/engine/plates.js";

for (const candidate of [".env", "../../.env"]) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is empty. Set it in .env and rerun.");
  process.exit(1);
}

const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const outDir = resolve(process.cwd(), "../web/public/art");
const rawArgv = process.argv.slice(2);
const force = rawArgv.includes("--force");
const variantsOnly = rawArgv.includes("--variants-only");

function parseStates(): HeroState[] {
  const eq = rawArgv.find((arg) => arg.startsWith("--states="));
  if (eq) {
    return eq
      .slice("--states=".length)
      .split(",")
      .map((item) => item.trim())
      .filter(isHeroState);
  }
  const idx = rawArgv.indexOf("--states");
  if (idx >= 0) {
    return (rawArgv[idx + 1] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(isHeroState);
  }
  return ["armed", "aura", "shadow"];
}

const requestedStates = parseStates();
const argv = rawArgv.filter((arg, index, all) => {
  if (arg.startsWith("-")) return false;
  if (all[index - 1] === "--states") return false;
  return true;
});

const IDENTITY = [
  "Original dark Korean manhwa webtoon still, cinematic lighting, ink and digital paint.",
  "Vertical 3:4 panel, figure-focused, not an empty environment.",
  "The SAME original character in every still: a lean Korean young-adult male hunter, not a licensed character, not a celebrity likeness.",
  "Keep the face recognisable across states: tired dark eyes, black hair, sharp jaw. Only hair neatness, coat, weapon, and aura change.",
  "Not a licensed character. Not a celebrity likeness. Original supporting cast only.",
  "No readable text, no letters, no numbers, no logos, no UI, no speech bubbles, no watermarks.",
].join(" ");

function catalogueKeys(): string[] {
  const variants = HERO_VARIANT_SCENES.flatMap((scene) =>
    requestedStates
      .filter((state) => state !== "worn")
      .map((state) => variantStillKey(scene, state)),
  );
  return [...PLATE_KEYS, ...variants];
}

function promptFor(key: string): string {
  const state = stillHeroState(key);
  return [
    IDENTITY,
    plateScene(key),
    state === "aura"
      ? "The blue mana must be obvious: electric cyan fire wrapping the body, glowing eyes, particles in the air. This is a power-up still."
      : "",
    state === "shadow"
      ? "Black high-collar coat, composed stare, blue-white core with a thin violet rim. Quiet. No smile."
      : "",
    state === "armed"
      ? "Notched black shortblade in hand. No full-body glow."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function destFor(key: string): string {
  return resolve(outDir, `${key}.png`);
}

async function generateOne(
  client: GoogleGenAI,
  key: string,
): Promise<Buffer | null> {
  const response = await client.models.generateContent({
    model,
    contents: promptFor(key),
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;
    return Buffer.from(data, "base64");
  }
  return null;
}

function quotaHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!/RESOURCE_EXHAUSTED|429/.test(message)) return null;
  const retry = message.match(/retry in ([\d.]+s)/i);
  return retry?.[1] ?? "later";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const wanted = argv.length
    ? argv.filter(
        (key) =>
          catalogueKeys().includes(key) || /\.(armed|aura|shadow)$/.test(key),
      )
    : variantsOnly
      ? catalogueKeys().filter((key) => stillHeroState(key) !== "worn")
      : catalogueKeys();
  const jobs = wanted.filter((key) => force || !existsSync(destFor(key)));
  console.info(
    `[stills] ${jobs.length} to paint, ${wanted.length - jobs.length} already on disk (${model})`,
  );
  if (!jobs.length) return;

  const client = new GoogleGenAI({ apiKey });
  const painted: string[] = [];
  let failed = 0;
  for (const key of jobs) {
    process.stdout.write(`[stills] ${key} ... `);
    try {
      let bytes = await generateOne(client, key);
      if (!bytes) {
        await delay(1500);
        bytes = await generateOne(client, key);
      }
      if (!bytes) {
        console.log("no image");
        failed += 1;
        continue;
      }
      await writeFile(destFor(key), bytes);
      console.log(`${bytes.length} bytes`);
      painted.push(key);
    } catch (error) {
      const retry = quotaHint(error);
      console.log(retry ? `quota — retry in ${retry}` : (error as Error).message);
      failed += 1;
      if (retry) {
        console.info(
          "[stills] This Gemini key has no image quota. Keep the original catalogue stills; aura is a CSS overlay, not a public image API.",
        );
        break;
      }
    }
    await delay(800);
  }
  console.info(`[stills] done. painted ${painted.length}, failed ${failed}`);
  if (failed) process.exitCode = 1;
}

await main();
