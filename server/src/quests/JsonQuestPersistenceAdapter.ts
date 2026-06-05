/**
 * JSON FILE PERSISTENCE ADAPTER
 *
 * Deterministic JSON file-based persistence for quest state.
 * MVP adapter that writes atomically using temp file + rename.
 *
 * Rules:
 * - No Date.now()
 * - No Math.random()
 * - Atomic writes via temp + rename
 * - Stable sort for deterministic output
 * - Corrupt JSON must not crash server
 * - No secrets required
 *
 * Config:
 * - QUEST_STATE_FILE env var for custom path
 * - Default: process.cwd()/data/quest-state.json
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedQuestState,
  normalizePersistedQuestState,
  type PersistedQuestPlayerState,
  type QuestPersistenceAdapter,
} from "./QuestPersistence";

interface QuestStateFile {
  schemaVersion: 1;
  players: PersistedQuestPlayerState[];
}

function stableQuestStateFile(players: PersistedQuestPlayerState[]): QuestStateFile {
  return {
    schemaVersion: 1,
    players: [...players]
      .map((player) => normalizePersistedQuestState(player, player.playerId))
      .sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function resolveQuestStateFilePath(): string {
  return process.env.QUEST_STATE_FILE
    ? path.resolve(process.env.QUEST_STATE_FILE)
    : path.resolve(process.cwd(), "data", "quest-state.json");
}

export class JsonQuestPersistenceAdapter implements QuestPersistenceAdapter {
  constructor(private readonly filePath: string = resolveQuestStateFilePath()) {}

  async loadPlayerQuestState(playerId: string): Promise<PersistedQuestPlayerState | null> {
    const file = await this.readStateFile();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizePersistedQuestState(found, playerId) : null;
  }

  async savePlayerQuestState(state: PersistedQuestPlayerState): Promise<void> {
    const file = await this.readStateFile();
    const normalized = normalizePersistedQuestState(state, state.playerId);
    const withoutPlayer = file.players.filter((player) => player.playerId !== normalized.playerId);
    const next = stableQuestStateFile([...withoutPlayer, normalized]);

    await this.writeStateFile(next);
  }

  async loadAllPlayerQuestStates(): Promise<PersistedQuestPlayerState[]> {
    const file = await this.readStateFile();
    return stableQuestStateFile(file.players).players;
  }

  private async readStateFile(): Promise<QuestStateFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<QuestStateFile>;

      const players = Array.isArray(parsed.players)
        ? parsed.players.map((player) => normalizePersistedQuestState(player, player.playerId ?? "unknown"))
        : [];

      return stableQuestStateFile(players);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return stableQuestStateFile([]);
      }

      // Corrupt JSON must not crash the server. Quarantine by ignoring in-memory read.
      // Later SelfHeal can detect and quarantine bad state files.
      return stableQuestStateFile([]);
    }
  }

  private async writeStateFile(file: QuestStateFile): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, stableStringify(file), "utf8");
    await rename(tmp, this.filePath);
  }
}