/**
 * NPC MEMORY STORE
 *
 * Deterministic JSON file-based persistence for NPC memory and rumors.
 * Provides atomic save/load with temp file + rename pattern.
 *
 * Rules:
 * - No Date now for gameplay state
 * - No Math random for gameplay IDs
 * - Atomic writes via temp + rename
 * - Stable sort for deterministic output
 * - Corrupt JSON must not crash server
 * - No secrets required
 *
 * Config:
 * - NPC_MEMORY_FILE env var for custom path
 * - Default: process.cwd()/data/npc-memory.json
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type PersistedNpcMemoryState,
  type NpcRumor,
  reputationToTrustTier,
} from "./NpcRumorTypes.js";

/**
 * Root file structure for NPC memory persistence.
 */
interface NpcMemoryStateFile {
  schemaVersion: 1;
  /** Player ID -> NPC ID -> PersistedNpcMemoryState */
  memoryStates: Record<string, Record<string, PersistedNpcMemoryState>>;
  /** All known rumors indexed by playerId for fast lookup */
  rumors: Record<string, NpcRumor[]>;
}

/**
 * Create empty state file.
 */
function createEmptyFile(): NpcMemoryStateFile {
  return {
    schemaVersion: 1,
    memoryStates: {},
    rumors: {},
  };
}

/**
 * Stable sort players, then NPCs, then events for deterministic output.
 */
function stableSortFile(file: NpcMemoryStateFile): NpcMemoryStateFile {
  const sortedPlayers = Object.keys(file.memoryStates).sort().reduce<Record<string, Record<string, PersistedNpcMemoryState>>>((acc, playerId) => {
    const npcRecords = file.memoryStates[playerId];
    const sortedNpCs = Object.keys(npcRecords).sort().reduce<Record<string, PersistedNpcMemoryState>>((npcAcc, npcId) => {
      const state = npcRecords[npcId];
      npcAcc[npcId] = {
        ...state,
        memoryEvents: [...state.memoryEvents].sort((a, b) => {
          if (a.logicalIndex !== b.logicalIndex) return a.logicalIndex - b.logicalIndex;
          // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
          return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
        }),
        knownRumorIds: [...state.knownRumorIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      };
      return npcAcc;
    }, {});
    acc[playerId] = sortedNpCs;
    return acc;
  }, {});

  const sortedRumors: Record<string, NpcRumor[]> = {};
  for (const [playerId, playerRumors] of Object.entries(file.rumors)) {
    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    sortedRumors[playerId] = [...playerRumors].sort((a, b) => (a.rumorId < b.rumorId ? -1 : a.rumorId > b.rumorId ? 1 : 0));
  }

  return {
    schemaVersion: 1,
    memoryStates: sortedPlayers,
    rumors: sortedRumors,
  };
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function resolveNpcMemoryFilePath(): string {
  return process.env.NPC_MEMORY_FILE
    ? path.resolve(process.env.NPC_MEMORY_FILE)
    : path.resolve(process.cwd(), "data", "npc-memory.json");
}

/**
 * JSON file-based NPC memory store.
 * Provides deterministic save/load for NPC memory and rumors.
 */
export class NpcMemoryStore {
  private filePath: string;

  constructor(filePath: string = resolveNpcMemoryFilePath()) {
    this.filePath = filePath;
  }

  /**
   * Load persisted memory state for a player-NPC pair.
   */
  async load(playerId: string, npcId: string): Promise<PersistedNpcMemoryState | null> {
    const file = await this.readStateFile();
    const playerMemories = file.memoryStates[playerId];
    if (!playerMemories) return null;
    return playerMemories[npcId] ?? null;
  }

  /**
   * Save memory state atomically.
   */
  async save(state: PersistedNpcMemoryState): Promise<void> {
    const file = await this.readStateFile();

    // Ensure player record exists
    if (!file.memoryStates[state.playerId]) {
      file.memoryStates[state.playerId] = {};
    }

    // Stable sort events before saving
    const sortedState: PersistedNpcMemoryState = {
      ...state,
      trustTier: reputationToTrustTier(state.reputation),
      memoryEvents: [...state.memoryEvents].sort((a, b) => {
        if (a.logicalIndex !== b.logicalIndex) return a.logicalIndex - b.logicalIndex;
        // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
        return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
      }),
      knownRumorIds: [...state.knownRumorIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    };

    file.memoryStates[state.playerId][state.npcId] = sortedState;

    await this.writeStateFile(stableSortFile(file));
  }

  /**
   * List all memory states for a player.
   */
  async listForPlayer(playerId: string): Promise<readonly PersistedNpcMemoryState[]> {
    const file = await this.readStateFile();
    const playerMemories = file.memoryStates[playerId];
    if (!playerMemories) return [];

    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    return Object.values(playerMemories).sort((a, b) => (a.npcId < b.npcId ? -1 : a.npcId > b.npcId ? 1 : 0));
  }

  /**
   * Load all rumors for a player.
   */
  async loadRumorsForPlayer(playerId: string): Promise<readonly NpcRumor[]> {
    const file = await this.readStateFile();
    return file.rumors[playerId] ?? [];
  }

  /**
   * Save a rumor atomically.
   */
  async saveRumor(rumor: NpcRumor): Promise<void> {
    const file = await this.readStateFile();

    if (!file.rumors[rumor.playerId]) {
      file.rumors[rumor.playerId] = [];
    }

    // Check for duplicate
    const existingIndex = file.rumors[rumor.playerId].findIndex((r) => r.rumorId === rumor.rumorId);
    if (existingIndex >= 0) {
      // Already exists, skip
      return;
    }

    file.rumors[rumor.playerId] = [...file.rumors[rumor.playerId], rumor];

    await this.writeStateFile(stableSortFile(file));
  }

  /**
   * Get all rumors known by a specific NPC.
   */
  async getRumorsForNpc(npcId: string, playerId: string): Promise<readonly NpcRumor[]> {
    const file = await this.readStateFile();
    const playerRumors = file.rumors[playerId] ?? [];
    return playerRumors.filter((r) => r.heardByNpcIds.includes(npcId));
  }

  /**
   * Check if a rumor already exists.
   */
  async hasRumor(rumorId: string, playerId: string): Promise<boolean> {
    const file = await this.readStateFile();
    const playerRumors = file.rumors[playerId] ?? [];
    return playerRumors.some((r) => r.rumorId === rumorId);
  }

  /**
   * Check if a memory event already exists.
   */
  async hasMemoryEvent(eventId: string, playerId: string, npcId: string): Promise<boolean> {
    const state = await this.load(playerId, npcId);
    if (!state) return false;
    return state.memoryEvents.some((e) => e.eventId === eventId);
  }

  private async readStateFile(): Promise<NpcMemoryStateFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<NpcMemoryStateFile>;

      const memoryStates: Record<string, Record<string, PersistedNpcMemoryState>> = {};
      if (parsed.memoryStates && typeof parsed.memoryStates === "object") {
        for (const [playerId, npcRecords] of Object.entries(parsed.memoryStates)) {
          if (npcRecords && typeof npcRecords === "object") {
            memoryStates[playerId] = {};
            for (const [npcId, state] of Object.entries(npcRecords)) {
              if (state && typeof state === "object") {
                memoryStates[playerId][npcId] = state as PersistedNpcMemoryState;
              }
            }
          }
        }
      }

      const rumors: Record<string, NpcRumor[]> = {};
      if (parsed.rumors && typeof parsed.rumors === "object") {
        for (const [playerId, playerRumors] of Object.entries(parsed.rumors)) {
          if (Array.isArray(playerRumors)) {
            rumors[playerId] = playerRumors as NpcRumor[];
          }
        }
      }

      return stableSortFile({
        schemaVersion: 1,
        memoryStates,
        rumors,
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return createEmptyFile();
      }

      // Corrupt JSON - return empty state, don't crash
      return createEmptyFile();
    }
  }

  private async writeStateFile(file: NpcMemoryStateFile): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, stableStringify(file), "utf8");
    await rename(tmp, this.filePath);
  }
}

/**
 * Global singleton instance.
 */
export const npcMemoryStore = new NpcMemoryStore();