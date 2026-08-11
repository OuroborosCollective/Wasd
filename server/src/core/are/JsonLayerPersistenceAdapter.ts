/**
 * JSON FILE LAYER PERSISTENCE ADAPTER
 *
 * Real, atomic-write JSON persistence for ARE 13-layer chunk state.
 * Backs the write-behind LayerPersistenceQueue (issue #2457) with provable
 * Write -> Read -> Rehydrate.
 *
 * Rules (ARE truth path):
 * - No wall-clock time / nondeterministic randomness for persisted gameplay state.
 * - Atomic writes via temp file + rename.
 * - Canonical sort by chunkKey for deterministic on-disk representation.
 * - Corrupt JSON must not crash the server; rehydrate stays fail-closed
 *   (returns null so the canonical seed path remains authoritative).
 * - schemaVersion explicit.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type LayerPersistenceAdapter,
  type PersistedLayerState,
  normalizePersistedLayerState,
} from './LayerPersistencePort.js';
import type { ChunkKey } from './types.js';

interface LayerStateFile {
  readonly schemaVersion: 1;
  readonly chunks: PersistedLayerState[];
}

function stableLayerStateFile(chunks: PersistedLayerState[]): LayerStateFile {
  return {
    schemaVersion: 1,
    chunks: [...chunks].sort((a, b) => String(a.chunkKey).localeCompare(String(b.chunkKey))),
  };
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function resolveLayerStateFilePath(): string {
  const fromEnv = process.env.LAYER_STATE_FILE?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), 'data', 'layer-state.json');
}

export class JsonLayerPersistenceAdapter implements LayerPersistenceAdapter {
  readonly driverName = 'json';

  constructor(private readonly filePath: string = resolveLayerStateFilePath()) {}

  async saveBatch(events: ReadonlyArray<PersistedLayerState>): Promise<void> {
    if (events.length === 0) return;

    const file = await this.readStateFile();
    const byKey = new Map<string, PersistedLayerState>(
      file.chunks.map((chunk) => [String(chunk.chunkKey), chunk]),
    );

    // Latest persisted wins: keep the newest tick per chunk key.
    for (const next of events) {
      const existing = byKey.get(String(next.chunkKey));
      if (!existing || Number(next.tick) >= Number(existing.tick)) {
        byKey.set(String(next.chunkKey), normalizePersistedLayerState(next) ?? existing!);
      }
    }

    const nextFile = stableLayerStateFile([...byKey.values()]);
    await this.writeStateFile(nextFile);
  }

  async loadChunkState(chunkKey: ChunkKey): Promise<PersistedLayerState | null> {
    const file = await this.readStateFile();
    const found = file.chunks.find((chunk) => String(chunk.chunkKey) === String(chunkKey));
    return found ?? null;
  }

  async loadAllChunkStates(): Promise<PersistedLayerState[]> {
    const file = await this.readStateFile();
    return stableLayerStateFile(file.chunks).chunks;
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      const dir = path.dirname(this.filePath);
      await mkdir(dir, { recursive: true });
      return { ok: true, driver: this.driverName };
    } catch (error) {
      return {
        ok: false,
        driver: this.driverName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readStateFile(): Promise<LayerStateFile> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LayerStateFile>;

      const chunks: PersistedLayerState[] = [];
      if (Array.isArray(parsed?.chunks)) {
        for (const raw of parsed.chunks) {
          const normalized = normalizePersistedLayerState(raw);
          if (normalized) chunks.push(normalized);
        }
      }

      return stableLayerStateFile(chunks);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return stableLayerStateFile([]);
      }
      // Corrupt JSON must not crash the server — fail closed (empty), so
      // rehydrate falls back to the canonical seed rather than bad data.
      return stableLayerStateFile([]);
    }
  }

  private async writeStateFile(file: LayerStateFile): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, stableStringify(file), 'utf8');
    await rename(tmp, this.filePath);
  }
}
