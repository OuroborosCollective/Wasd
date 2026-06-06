import fs from "node:fs";
import path from "node:path";
import { serializePlayerForPersistence } from "./playerSnapshot.js";
import type { IPersistenceBackend } from "./persistenceBackend.js";
import { resolvePlayersFilePath } from "./persistencePaths.js";

export class FilePersistenceBackend implements IPersistenceBackend {
  readonly name = "file";
  private readonly playersFilePath: string;

  constructor(playersFilePath?: string) {
    this.playersFilePath = playersFilePath ?? resolvePlayersFilePath();
  }

  async init(): Promise<void> {
    console.log(`[Persistence] File backend: ${this.playersFilePath}`);
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async save(data: Readonly<Record<string, unknown>>): Promise<void> {
    try {
      const dir = path.dirname(this.playersFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, unknown> = {};
      for (const id in data) {
        serializable[id] = {
          ...serializePlayerForPersistence(data[id]),
          lastUpdated: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
        };
      }
      fs.writeFileSync(this.playersFilePath, JSON.stringify(serializable, null, 2), "utf-8");
      console.log(`Saved ${Object.keys(data).length} players to ${this.playersFilePath}.`);
    } catch (err) {
      console.error("Failed to save players to file:", err);
    }
  }

  async load(): Promise<Record<string, unknown>> {
    try {
      if (!fs.existsSync(this.playersFilePath)) {
        console.log(`[Persistence] No player save file yet (${this.playersFilePath}).`);
        return {};
      }
      const raw = fs.readFileSync(this.playersFilePath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const count = Object.keys(parsed).length;
      console.log(`Loaded ${count} players from ${this.playersFilePath}.`);
      return parsed;
    } catch (err) {
      console.error("Failed to load players from file:", err);
      return {};
    }
  }

  async saveWorldObjects(
    _objects: readonly Readonly<Record<string, unknown>>[],
  ): Promise<void> {
    console.warn("[Persistence] File backend does not persist world objects.");
  }

  async loadWorldObjects(): Promise<Record<string, unknown>[]> {
    return [];
  }
}
