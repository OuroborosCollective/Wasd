export interface ChunkCoord {
  cx: number;
  cy: number;
}

export interface ChunkInfo extends ChunkCoord {
  id: string;
  worldX: number;
  worldY: number;
}

export function chunkId(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

export function worldToChunk(x: number, y: number, chunkSize: number): ChunkCoord {
  return {
    cx: Math.floor(x / chunkSize),
    cy: Math.floor(y / chunkSize)
  };
}

export function getObservedChunks(
  x: number,
  y: number,
  chunkSize: number,
  radius: number
): ChunkInfo[] {
  const center = worldToChunk(x, y, chunkSize);
  const chunks: ChunkInfo[] = [];

  for (let cy = center.cy - radius; cy <= center.cy + radius; cy += 1) {
    for (let cx = center.cx - radius; cx <= center.cx + radius; cx += 1) {
      chunks.push({
        cx,
        cy,
        id: chunkId(cx, cy),
        worldX: cx * chunkSize,
        worldY: cy * chunkSize
      });
    }
  }

  return chunks;
}