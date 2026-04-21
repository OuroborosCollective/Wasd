import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolvePlayersFilePath(): string {
  const fromEnv = process.env.PLAYER_SAVE_FILE?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "data", "players.json"),
    path.resolve(cwd, "..", "data", "players.json"),
    /** From server/src/modules/persistence → server/data */
    path.join(__dirname, "..", "..", "..", "data", "players.json"),
  ];
  return candidates[0];
}
