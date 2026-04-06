import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directory for large GLB trees at repo root (`world-assets/`), served at `/world-assets/*`.
 * Uses WORLD_ASSETS_DIR, or repo root from cwd walk, or relative to server package.
 */
export function resolveWorldAssetsDir(): string | null {
  const fromEnv = process.env.WORLD_ASSETS_DIR?.trim();
  if (fromEnv) {
    const abs = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
    return null;
  }
  const repo = findRepoRootWithGameData();
  if (repo) {
    const w = path.join(repo, "world-assets");
    if (fs.existsSync(w) && fs.statSync(w).isDirectory()) return w;
  }
  const fromServer = path.resolve(__dirname, "../../../world-assets");
  if (fs.existsSync(fromServer) && fs.statSync(fromServer).isDirectory()) return fromServer;
  return null;
}
