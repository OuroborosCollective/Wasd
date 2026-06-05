/**
 * JSON INVENTORY PERSISTENCE ADAPTER
 *
 * File-based inventory persistence for development/testing.
 * Atomic writes ensure data integrity.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedPlayerInventoryState,
  type InventoryPersistenceAdapter,
  type PersistedPlayerInventoryState,
} from "./InventoryPersistence.js";
import { normalizePlayerInventoryState } from "./InventoryTypes.js";

interface InventoryFile {
  schemaVersion: 1;
  players: PersistedPlayerInventoryState[];
}

function stableFile(players: PersistedPlayerInventoryState[]): InventoryFile {
  return {
    schemaVersion: 1,
    players: [...players]
      .map((player) => createPersistedPlayerInventoryState(player.playerId, player))
      .sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

export function resolveInventoryStateFilePath(): string {
  return process.env.INVENTORY_STATE_FILE
    ? path.resolve(process.env.INVENTORY_STATE_FILE)
    : path.resolve(process.cwd(), "data", "inventory-state.json");
}

export class JsonInventoryPersistenceAdapter implements InventoryPersistenceAdapter {
  constructor(private readonly filePath = resolveInventoryStateFilePath()) {}

  async loadPlayerInventory(playerId: string): Promise<PersistedPlayerInventoryState | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizePlayerInventoryState(found, playerId) : null;
  }

  async savePlayerInventory(state: PersistedPlayerInventoryState): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedPlayerInventoryState(state.playerId, state);
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

  private async readFileSafe(): Promise<InventoryFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<InventoryFile>;

      return stableFile(
        Array.isArray(parsed.players)
          ? parsed.players.map((player) => normalizePlayerInventoryState(player, player.playerId))
          : [],
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: InventoryFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}