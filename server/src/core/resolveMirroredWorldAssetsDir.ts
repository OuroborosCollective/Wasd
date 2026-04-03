import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * `client/public/assets/models/world-assets/` — mirror of repo-root `world-assets/`
 * populated by `scripts/sync-world-assets.mjs` before Vite build.
 * Used to serve legacy `/world-assets/*` URLs from the same tree without duplicating logic.
 */
export function resolveMirroredWorldAssetsDir(): string | null {
  const fromEnv = process.env.MIRRORED_WORLD_ASSETS_DIR?.trim();
  if (fromEnv) {
    const abs = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
    return null;
  }
  const repo = findRepoRootWithGameData();
  if (repo) {
    const w = path.join(repo, "client", "public", "assets", "models", "world-assets");
    if (fs.existsSync(w) && fs.statSync(w).isDirectory()) return w;
  }
  const fromServer = path.resolve(__dirname, "../../../client/public/assets/models/world-assets");
  if (fs.existsSync(fromServer) && fs.statSync(fromServer).isDirectory()) return fromServer;
  return null;
}
