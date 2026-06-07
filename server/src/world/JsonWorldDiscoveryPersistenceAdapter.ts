/**
 * JSON WORLD DISCOVERY PERSISTENCE ADAPTER
 *
 * File-based discovery persistence for development/testing.
 * Atomic writes ensure data integrity.
 *
 * Path: data/world-discovery-state.json (or env WORLD_DISCOVERY_STATE_FILE)
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type WorldDiscoveryState,
  type ChunkKey,
  createDefaultDiscoveryState,
  createStarterDiscoveryState,
  STARTER_VILLAGE_POI_IDS,
} from "./WorldDiscoveryTypes.js";

interface DiscoveryFile {
  schemaVersion: 1;
  players: PersistedDiscoveryState[];
}

interface PersistedDiscoveryState {
  playerId: string;
  schemaVersion: 1;
  discoveredPoiIds: string[];
  discoveredChunks: string[];
  autoSeededStarter: boolean;
}

function normalizePoiIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function normalizeChunkKeys(keys: unknown): ChunkKey[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter((k) => typeof k === "string" && k.includes(":"))).map((k) => k as ChunkKey)].sort((a, b) =>
    a.localeCompare(b),
  );
}

function stableFile(players: PersistedDiscoveryState[]): DiscoveryFile {
  return {
    schemaVersion: 1,
    players: [...players].sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

export function resolveWorldDiscoveryStateFilePath(): string {
  return process.env.WORLD_DISCOVERY_STATE_FILE
    ? path.resolve(process.env.WORLD_DISCOVERY_STATE_FILE)
    : path.resolve(process.cwd(), "data", "world-discovery-state.json");
}

/**
 * Simple write queue to serialize concurrent saves.
 * Uses a promise chain to ensure only one write happens at a time.
 */
class WriteQueue {
  private lastWrite: Promise<void> = Promise.resolve();

  async enqueue(fn: () => Promise<void>): Promise<void> {
    const waitForPrevious = this.lastWrite;
    let currentWriteComplete: Promise<void>;
    this.lastWrite = new Promise((resolve) => {
      currentWriteComplete = fn().then(() => {
        resolve();
        return undefined as void;
      });
    });
    await waitForPrevious;
    await currentWriteComplete;
  }
}

export class JsonWorldDiscoveryPersistenceAdapter {
  private readonly filePath: string;
  private readonly writeQueue = new WriteQueue();

  constructor(filePath = resolveWorldDiscoveryStateFilePath()) {
    this.filePath = filePath;
  }

  async loadDiscovery(playerId: string): Promise<WorldDiscoveryState | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((p) => p.playerId === playerId);
    if (!found) return null;

    return {
      playerId: found.playerId,
      schemaVersion: 1,
      discoveredPoiIds: normalizePoiIds(found.discoveredPoiIds),
      discoveredChunks: normalizeChunkKeys(found.discoveredChunks),
    };
  }

  async saveDiscovery(state: WorldDiscoveryState, autoSeededStarter: boolean = false): Promise<void> {
    await this.writeQueue.enqueue(async () => {
      const file = await this.readFileSafe();
      const normalized: PersistedDiscoveryState = {
        playerId: state.playerId,
        schemaVersion: 1,
        discoveredPoiIds: [...state.discoveredPoiIds],
        discoveredChunks: [...state.discoveredChunks],
        autoSeededStarter,
      };
      const withoutPlayer = file.players.filter((p) => p.playerId !== normalized.playerId);
      await this.writeFileAtomic(stableFile([...withoutPlayer, normalized]));
    });
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

  async loadOrCreateDefault(playerId: string): Promise<WorldDiscoveryState> {
    const loaded = await this.loadDiscovery(playerId);
    if (loaded) return loaded;
    return createStarterDiscoveryState(playerId);
  }

  private async readFileSafe(): Promise<DiscoveryFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DiscoveryFile>;

      if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.players)) {
        return stableFile([]);
      }

      return stableFile(
        parsed.players.map((p) => ({
          playerId: String(p.playerId ?? ""),
          schemaVersion: 1,
          discoveredPoiIds: normalizePoiIds(p.discoveredPoiIds),
          discoveredChunks: normalizeChunkKeys(p.discoveredChunks),
          autoSeededStarter: Boolean(p.autoSeededStarter),
        })),
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: DiscoveryFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    const timestamp = Date.now();
    const tmpWithTimestamp = `${this.filePath}.${timestamp}.tmp`;
    await writeFile(tmpWithTimestamp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmpWithTimestamp, this.filePath);
  }
}