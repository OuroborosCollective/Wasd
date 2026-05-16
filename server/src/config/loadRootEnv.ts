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

export function loadRootEnvFiles(): void {
  const fromMonorepoRoot = resolveMonorepoRootEnvPath();
  const fromCwd = path.resolve(process.cwd(), ".env");
  const opt = "/opt/areloria/.env";
  const e2eServer = process.env.OURO_E2E_SERVER === "1";

  tryLoad(fromMonorepoRoot, false);
  // When Playwright (or scripts) starts the server with a curated env, do not let cwd `.env`
  // override it — repo `.env` often points DATABASE_URL at a Docker hostname (`db`).
  tryLoad(fromCwd, !e2eServer);
  tryLoad(opt, true);
}
