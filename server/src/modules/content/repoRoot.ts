import fs from "node:fs";
import path from "node:path";

/** Find monorepo root containing `game-data/npc/npcs.json` (walk up from cwd). */
export function findRepoRootWithGameData(): string | null {
  let d = path.resolve(process.cwd());
  for (let i = 0; i < 12; i++) {
    const test = path.join(d, "game-data", "npc", "npcs.json");
    if (fs.existsSync(test)) {
      return d;
    }
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
}
