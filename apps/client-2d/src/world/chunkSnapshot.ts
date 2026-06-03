import type { EntityState } from "../world/entities";

export interface ChunkTile {
  x: number;
  y: number;
  terrain: "grass" | "forest" | "water" | "mountain" | "road" | "town";
}

export interface ChunkSnapshot {
  chunkId: string;
  serverTick: number;
  tiles: ChunkTile[];
  entities?: EntityState[];
}

export interface ChunkSnapshotStore {
  apply(snapshot: ChunkSnapshot): void;
  get(chunkId: string): ChunkSnapshot | null;
  getAll(): ChunkSnapshot[];
  size(): number;
  clear(): void;
}

export function createChunkSnapshotStore(maxChunks = 128): ChunkSnapshotStore {
  const chunks = new Map<string, ChunkSnapshot>();

  return {
    apply(snapshot) {
      chunks.set(snapshot.chunkId, {
        ...snapshot,
        tiles: snapshot.tiles.map((tile) => ({ ...tile })),
        entities: snapshot.entities?.map((entity) => ({ ...entity }))
      });

      while (chunks.size > maxChunks) {
        const first = chunks.keys().next().value;
        if (typeof first === "string") {
          chunks.delete(first);
        } else {
          break;
        }
      }
    },

    get(chunkId) {
      return chunks.get(chunkId) ?? null;
    },

    getAll() {
      return Array.from(chunks.values()).map((snapshot) => ({
        ...snapshot,
        tiles: snapshot.tiles.map((tile) => ({ ...tile })),
        entities: snapshot.entities?.map((entity) => ({ ...entity }))
      }));
    },

    size() {
      return chunks.size;
    },

    clear() {
      chunks.clear();
    }
  };
}