import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Local development reads the repo-root .env. In production the platform
 * injects real environment variables and no file exists, so this is a no-op.
 */
for (const candidate of [".env", "../../.env"]) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Render injects PORT; bind 0.0.0.0 so the platform can reach the process.
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  // Optional: when unset the engine keeps sessions in process memory. Render
  // Hobby only allows one free Key Value instance per workspace.
  REDIS_URL: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),

  LLM_PROVIDER: z.enum(["auto", "gemini", "cohere", "mock"]).default("auto"),
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  /** Image-capable Gemini model used only for the end-of-run still. */
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),
  COHERE_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  /** Command R 08-2024: JSON mode, safety OFF, trial-key eligible. */
  COHERE_MODEL: z.string().default("command-r-08-2024"),

  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  CONTEXT_WINDOW: z.coerce.number().int().positive().default(10),
  /** Share of eligible transitions served from Postgres instead of the model. */
  STATIC_NODE_RATIO: z.coerce.number().min(0).max(1).default(0.35),
  /** Path-overlap ratio above which a run is diverted into a Red Gate. */
  COLLISION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  /**
   * How many candidate choices get their next panel speculatively generated
   * during read time. Each one costs two extra model calls, so this is the
   * direct dial between zero perceived latency and API spend. 0 disables it and
   * falls back to generating choices in parallel with narration only.
   */
  PREFETCH_FANOUT: z.coerce.number().int().min(0).max(4).default(1),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();

export type LiveProvider = "gemini" | "cohere";

/**
 * Live models in failover order. `mock` is never listed here — generation.ts
 * owns that last-resort path. `auto` / `gemini` try Gemini then Cohere;
 * `cohere` flips the order. Empty keys are skipped so the stack still boots.
 */
export function liveProviderChain(): LiveProvider[] {
  if (env.LLM_PROVIDER === "mock") return [];
  const gemini = Boolean(env.GEMINI_API_KEY);
  const cohere = Boolean(env.COHERE_API_KEY);
  const ordered: LiveProvider[] =
    env.LLM_PROVIDER === "cohere" ? ["cohere", "gemini"] : ["gemini", "cohere"];
  return ordered.filter((name) => (name === "gemini" ? gemini : cohere));
}

export const activeProvider: LiveProvider | "mock" =
  liveProviderChain()[0] ?? "mock";

export const isProd = env.NODE_ENV === "production";
