export function loadWorldChunk(chunkX: number, chunkY: number) {
  return {
    chunkX,
    chunkY,
    status: "requested"
  };
}