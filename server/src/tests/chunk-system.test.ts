import { describe, it, expect } from 'vitest';
import { ChunkSystem } from '../modules/world/ChunkSystem.js';

describe('ChunkSystem Optimization', () => {
  it('correctly tracks active chunks', () => {
    const system = new ChunkSystem(64);

    // Create some chunks
    system.getChunk(0, 0);
    system.getChunk(1, 1);
    system.getChunk(2, 2);

    expect(system.getActiveChunks().length).toBe(0);

    // Activate one chunk
    system.setChunkActive('0:0', true);
    let active = system.getActiveChunks();
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('0:0');

    // Activate another
    system.setChunkActive('1:1', true);
    active = system.getActiveChunks();
    expect(active.length).toBe(2);

    // Deactivate one
    system.setChunkActive('0:0', false);
    active = system.getActiveChunks();
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('1:1');

    // Reactivate
    system.setChunkActive('0:0', true);
    expect(system.getActiveChunks().length).toBe(2);

    // Deactivate all
    system.setChunkActive('0:0', false);
    system.setChunkActive('1:1', false);
    expect(system.getActiveChunks().length).toBe(0);
  });
});
