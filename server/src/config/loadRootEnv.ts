/**
 * Load `.env` before any other server config reads `process.env`.
 * PM2 `cwd` is often the monorepo root, but some setups run with `cwd` under `server/` 
 * or only deploy `server/dist`. We always load the repo-root `.env` from this file's
 * location (`server/src/config` or `server/dist/config` -> three levels up to repo root).
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Use a name that doesn't conflict with CommonJS globals
const currentDir = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(fileURLToPath(import.meta.url));

function tryLoad(p: string, override: boolean): void {
  if (!p || !fs.existsSync(p)) return;
  dotenv.config({ path: p, override });
}

/** Repo-root `.env` (same directory as `server/`). Exported for tests. */
export function resolveMonorepoRootEnvPath(): string {
  return path.resolve(currentDir, "..", "..", "..", ".env");
}

function envTruthy(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function loadRootEnvFiles(): void {
  /** Playwright/e2e supplies explicit env; skip `.env` so cwd override cannot resurrect Docker `DATABASE_URL`. */
  if (envTruthy("E2E_SKIP_DOTENV")) {
    return;
  }
  const fromMonorepoRoot = resolveMonorepoRootEnvPath();
  const fromCwd = path.resolve(process.cwd(), ".env");
  const opt = "/opt/areloria/.env";

  tryLoad(fromMonorepoRoot, false);
  tryLoad(fromCwd, true);
  tryLoad(opt, true);
}
