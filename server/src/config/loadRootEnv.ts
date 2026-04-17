/**
 * Load `.env` before any other server config reads `process.env`.
 * PM2 `cwd` is usually the repo root, but some setups run with a different cwd;
 * we always try the monorepo `.env` next to `server/` (from `server/dist/` → `../../.env`).
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function tryLoad(p: string, override: boolean): void {
  if (!p || !fs.existsSync(p)) return;
  dotenv.config({ path: p, override });
}

export function loadRootEnvFiles(): void {
  const fromDist = path.resolve(__dirname, "../../.env");
  const fromCwd = path.resolve(process.cwd(), ".env");
  const opt = "/opt/areloria/.env";

  tryLoad(fromDist, false);
  tryLoad(fromCwd, true);
  tryLoad(opt, true);
}
