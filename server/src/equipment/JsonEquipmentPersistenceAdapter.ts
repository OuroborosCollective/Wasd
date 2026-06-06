/**
 * JSON EQUIPMENT PERSISTENCE ADAPTER
 *
 * File-based equipment persistence for development/testing.
 * Atomic writes ensure data integrity.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedPlayerEquipmentState,
  type EquipmentPersistenceAdapter,
  type PersistedPlayerEquipmentState,
} from "./EquipmentPersistence.js";
import { normalizeEquipmentState } from "./EquipmentTypes.js";

interface EquipmentFile {
  schemaVersion: 1;
  players: PersistedPlayerEquipmentState[];
}

function stableFile(players: PersistedPlayerEquipmentState[]): EquipmentFile {
  return {
    schemaVersion: 1,
    players: [...players]
      .map((player) => createPersistedPlayerEquipmentState(player.playerId, player))
      .sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

export function resolveEquipmentStateFilePath(): string {
  return process.env.EQUIPMENT_STATE_FILE
    ? path.resolve(process.env.EQUIPMENT_STATE_FILE)
    : path.resolve(process.cwd(), "data", "equipment-state.json");
}

export class JsonEquipmentPersistenceAdapter implements EquipmentPersistenceAdapter {
  constructor(private readonly filePath = resolveEquipmentStateFilePath()) {}

  async loadPlayerEquipment(playerId: string): Promise<PersistedPlayerEquipmentState | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ? normalizeEquipmentState(found, playerId) : null;
  }

  async savePlayerEquipment(state: PersistedPlayerEquipmentState): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedPlayerEquipmentState(state.playerId, state);
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

  private async readFileSafe(): Promise<EquipmentFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<EquipmentFile>;

      return stableFile(
        Array.isArray(parsed.players)
          ? parsed.players.map((player) => normalizeEquipmentState(player, player.playerId))
          : [],
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: EquipmentFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}