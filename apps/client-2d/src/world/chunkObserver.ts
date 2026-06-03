import { getObservedChunks, worldToChunk, type ChunkInfo } from "./chunks";

export interface ChunkObservePayload {
  centerChunkId: string;
  chunks: string[];
}

export interface ChunkObserver {
  update(playerX: number, playerY: number): ChunkObservePayload | null;
  getObservedChunks(): ChunkInfo[];
}

export function createChunkObserver(options: {
  chunkSize: number;
  radius: number;
}): ChunkObserver {
  let lastCenter = "";
  let observed: ChunkInfo[] = [];

  return {
    update(playerX, playerY) {
      const center = worldToChunk(playerX, playerY, options.chunkSize);
      const centerChunkId = `${center.cx}:${center.cy}`;

      // Only emit if center chunk changed
      if (centerChunkId === lastCenter) {
        return null;
      }

      lastCenter = centerChunkId;
      observed = getObservedChunks(
        playerX,
        playerY,
        options.chunkSize,
        options.radius
      );

      return {
        centerChunkId,
        chunks: observed.map((chunk) => chunk.id)
      };
    },

    getObservedChunks() {
      return observed.slice();
    }
  };
}