import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package ships as workspace-local ESM rather than a published build.
  transpilePackages: ["@system/shared"],
  // Pin tracing to the monorepo root; Next otherwise guesses from the nearest
  // lockfile it finds walking up, which can land outside the project.
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
