import fs from "node:fs";
import path from "node:path";

function looksLikeMonorepoRoot(dir: string): boolean {
  const hasGameData = fs.existsSync(path.join(dir, "game-data", "npc", "npcs.json"));
  if (!hasGameData) return false;
  const hasClient = fs.existsSync(path.join(dir, "client", "package.json"));
  const hasWorkspace = fs.existsSync(path.join(dir, "pnpm-workspace.yaml"));
  return hasClient || hasWorkspace;
}

/**
 * Walk up from cwd to the **monorepo root** (not `server/` with a `game-data` symlink).
 */
export function findRepoRootWithGameData(): string | null {
  let d = path.resolve(process.cwd());
  for (let i = 0; i < 12; i++) {
    if (looksLikeMonorepoRoot(d)) {
      return d;
    }
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
}
