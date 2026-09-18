/**
 * Batch-paints missing catalogue stills with Gemini Image.
 * Existing PNGs are skipped so this is safe to rerun.
 *
 *   npm run stills -w @system/server
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { PLATE_KEYS } from "@system/shared";
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
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const force = process.argv.includes("--force");

const CHARACTER = [
  "Original dark Korean manhwa webtoon still, cinematic lighting, ink and digital paint.",
  "Vertical 3:4 panel, figure-focused, not an empty environment.",
  "The same original character in every still: a lean exhausted Korean young-adult male E-rank hunter, messy black hair, tired dark eyes, cheap cracked brown leather chestpiece over a navy hoodie, worn combat boots, a cheap wrapped shortsword.",
  "Not a licensed character. Not a celebrity likeness. Original supporting cast only.",
  "No readable text, no letters, no numbers, no logos, no UI, no speech bubbles, no watermarks.",
].join(" ");

function promptFor(key: string): string {
  return `${CHARACTER} Scene: ${plateScene(key)}`;
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

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const wanted = only.length
    ? PLATE_KEYS.filter((key) => only.includes(key))
    : [...PLATE_KEYS];
  const jobs = wanted.filter((key) => force || !existsSync(destFor(key)));
  console.info(
    `[stills] ${jobs.length} to paint, ${wanted.length - jobs.length} already on disk (${model})`,
  );
  if (!jobs.length) return;

  const client = new GoogleGenAI({ apiKey });
  let ok = 0;
  let failed = 0;
  for (const key of jobs) {
    process.stdout.write(`[stills] ${key} ... `);
    try {
      let bytes = await generateOne(client, key);
      if (!bytes) {
        await new Promise((r) => setTimeout(r, 1500));
        bytes = await generateOne(client, key);
      }
      if (!bytes) {
        console.log("no image");
        failed += 1;
        continue;
      }
      await writeFile(destFor(key), bytes);
      console.log(`${bytes.length} bytes`);
      ok += 1;
    } catch (error) {
      const retry = quotaHint(error);
      console.log(retry ? `quota — retry in ${retry}` : (error as Error).message);
      failed += 1;
      if (retry) {
        console.info(
          "[stills] Image quota is exhausted. Remaining keys stay on CSS biomes. Rerun `npm run stills -w @system/server` after billing or a paid image model is enabled.",
        );
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  console.info(`[stills] done. painted ${ok}, failed ${failed}`);
  if (failed) process.exitCode = 1;
}

await main();
