import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizeNpcQuestPlayerState,
  type NpcQuestPersistenceAdapter,
  type PersistedNpcQuestPlayerState,
} from "./NpcQuestPersistence.js";

interface NpcQuestStateFile {
  readonly schemaVersion: 1;
  readonly players: readonly PersistedNpcQuestPlayerState[];
}

function resolveFilePath(): string {
  return process.env.NPC_QUEST_STATE_FILE
    ? path.resolve(process.env.NPC_QUEST_STATE_FILE)
    : path.resolve(process.cwd(), "data", "npc-quest-state.json");
}

function stableFile(players: readonly PersistedNpcQuestPlayerState[]): NpcQuestStateFile {
  return Object.freeze({
    schemaVersion: 1 as const,
    players: Object.freeze(
      players
        .map((player) => normalizeNpcQuestPlayerState(player, player.playerId))
        .sort((a, b) => a.playerId.localeCompare(b.playerId)),
    ),
  });
}

export class JsonNpcQuestPersistenceAdapter implements NpcQuestPersistenceAdapter {
  public constructor(private readonly filePath: string = resolveFilePath()) {}

  public async loadPlayerState(playerId: string): Promise<PersistedNpcQuestPlayerState | null> {
    const file = await this.readFile();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizeNpcQuestPlayerState(found, playerId) : null;
  }

  public async savePlayerState(state: PersistedNpcQuestPlayerState): Promise<void> {
    const file = await this.readFile();
    const normalized = normalizeNpcQuestPlayerState(state, state.playerId);
    const next = stableFile([
      ...file.players.filter((player) => player.playerId !== normalized.playerId),
      normalized,
    ]);
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }

  private async readFile(): Promise<NpcQuestStateFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<NpcQuestStateFile>;
      const players = Array.isArray(parsed.players)
        ? parsed.players.map((player) => normalizeNpcQuestPlayerState(player, player.playerId ?? "unknown"))
        : [];
      return stableFile(players);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return stableFile([]);
      return stableFile([]);
    }
  }
}
