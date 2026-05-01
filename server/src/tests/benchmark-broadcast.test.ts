import { describe, it } from 'vitest';

describe('Broadcast Metadata Optimization Benchmark', () => {
  it('measures impact of pre-calculated metadata vs inline string parsing', () => {
    const numObservedChunks = 100;
    const chunkObjects = new Map<string, any[]>();

    // Setup mock chunks
    const observedChunkIds: string[] = [];
    const observedChunkObjects: Array<{ id: string; chunkX: number; chunkY: number }> = [];

    for (let i = 0; i < numObservedChunks; i++) {
      const id = `${i}:${i}`;
      observedChunkIds.push(id);
      observedChunkObjects.push({ id, chunkX: i, chunkY: i });
      chunkObjects.set(id, [{ id: 'obj_' + i }]);
    }

    const iterations = 10000;

    // 1. Current approach (simulated): String parsing for every chunk in every tick
    const startParsing = performance.now();
    for (let t = 0; t < iterations; t++) {
      const chunks: any[] = [];
      for (const chunkId of observedChunkIds) {
        const [cx, cy] = chunkId.split(":").map(Number);
        chunks.push({
          id: chunkId,
          chunkX: cx,
          chunkY: cy,
          objects: chunkObjects.get(chunkId) || [],
        });
      }
    }
    const endParsing = performance.now();
    const timeParsing = endParsing - startParsing;

    // 2. Optimized approach: Using pre-calculated metadata
    const startOptimized = performance.now();
    for (let t = 0; t < iterations; t++) {
      const chunks: any[] = [];
      for (let i = 0; i < observedChunkObjects.length; i++) {
        const c = observedChunkObjects[i];
        chunks.push({
          id: c.id,
          chunkX: c.chunkX,
          chunkY: c.chunkY,
          objects: chunkObjects.get(c.id) || [],
        });
      }
    }
    const endOptimized = performance.now();
    const timeOptimized = endOptimized - startOptimized;

    console.log(`[Benchmark] ${iterations} iterations with ${numObservedChunks} chunks:`);
    console.log(`  - Inline Parsing: ${timeParsing.toFixed(2)}ms`);
    console.log(`  - Pre-calculated: ${timeOptimized.toFixed(2)}ms`);
    console.log(`  - Speedup: ${((timeParsing / timeOptimized - 1) * 100).toFixed(1)}%`);
  });
});
