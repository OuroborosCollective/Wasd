/**
 * JSON SKILL PERSISTENCE ADAPTER
 *
 * File-based persistence for skill state. Reads legacy schema 1 and always
 * writes exact cap-free schema 2.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedPlayerSkillState,
  type PersistedPlayerSkillState,
  type SkillPersistenceAdapter,
} from "./SkillPersistence.js";
import { normalizePlayerSkillState } from "./SkillTypes.js";

interface SkillStateFile {
  schemaVersion: 2;
  players: PersistedPlayerSkillState[];
}

function binaryCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableFile(players: PersistedPlayerSkillState[]): SkillStateFile {
  return {
    schemaVersion: 2,
    players: [...players]
      .map((player) => createPersistedPlayerSkillState(player.playerId, player))
      .sort((a, b) => binaryCompare(a.playerId, b.playerId)),
  };
}

export function resolveSkillStateFilePath(): string {
  return process.env.SKILL_STATE_FILE
    ? path.resolve(process.env.SKILL_STATE_FILE)
    : path.resolve(process.cwd(), "data", "skill-state.json");
}

export class JsonSkillPersistenceAdapter implements SkillPersistenceAdapter {
  constructor(private readonly filePath = resolveSkillStateFilePath()) {}

  async loadPlayerSkillState(playerId: string): Promise<PersistedPlayerSkillState | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizePlayerSkillState(found, playerId) : null;
  }

  async savePlayerSkillState(state: PersistedPlayerSkillState): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedPlayerSkillState(state.playerId, state);
    const withoutPlayer = file.players.filter((player) => player.playerId !== normalized.playerId);
    await this.writeFileAtomic(stableFile([...withoutPlayer, normalized]));
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      return { ok: true, driver: "json" };
    } catch (error) {
      return {
        ok: false,
        driver: "json",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readFileSafe(): Promise<SkillStateFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as { players?: unknown[]; schemaVersion?: number };

      return stableFile(
        Array.isArray(parsed.players)
          ? parsed.players
              .filter((player): player is Record<string, unknown> => Boolean(player && typeof player === "object"))
              .map((player) => normalizePlayerSkillState(
                player as any,
                typeof player.playerId === "string" ? player.playerId : "",
              ))
              .filter((player) => player.playerId.length > 0)
          : [],
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return stableFile([]);
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: SkillStateFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}
