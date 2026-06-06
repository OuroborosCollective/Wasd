/**
 * JSON CHARACTER PERSISTENCE ADAPTER
 *
 * File-based character persistence for development/testing.
 * Atomic writes ensure data integrity.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedCharacterProfile,
  type CharacterPersistenceAdapter,
  type PersistedCharacterProfile,
} from "./CharacterPersistence.js";
import { normalizeCharacterProfile } from "./CharacterTypes.js";

interface CharacterFile {
  schemaVersion: 1;
  players: PersistedCharacterProfile[];
}

function stableFile(players: PersistedCharacterProfile[]): CharacterFile {
  return {
    schemaVersion: 1,
    players: [...players]
      .map((player) => createPersistedCharacterProfile(player.playerId, player))
      .sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

export function resolveCharacterStateFilePath(): string {
  return process.env.CHARACTER_STATE_FILE
    ? path.resolve(process.env.CHARACTER_STATE_FILE)
    : path.resolve(process.cwd(), "data", "character-state.json");
}

export class JsonCharacterPersistenceAdapter implements CharacterPersistenceAdapter {
  constructor(private readonly filePath = resolveCharacterStateFilePath()) {}

  async loadCharacterProfile(playerId: string): Promise<PersistedCharacterProfile | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizeCharacterProfile(found, playerId) : null;
  }

  async saveCharacterProfile(state: PersistedCharacterProfile): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedCharacterProfile(state.playerId, state);
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

  private async readFileSafe(): Promise<CharacterFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<CharacterFile>;

      return stableFile(
        Array.isArray(parsed.players)
          ? parsed.players.map((player) => normalizeCharacterProfile(player, player.playerId))
          : [],
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: CharacterFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}