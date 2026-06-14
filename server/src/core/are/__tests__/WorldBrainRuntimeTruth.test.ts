import { describe, expect, it } from 'vitest';
import { WorldTickThinShell } from '../WorldTickThinShell.js';

function registerProvider(shell: WorldTickThinShell): void {
  shell.registerWorldStateProvider({
    id: 'runtime-truth-provider',
    getWorldState: () => ({
      npcs: [{ id: 'npc-runtime-truth' }],
      players: [{ id: 'player-runtime-truth' }],
      loot: [],
      worldEvents: [],
    }),
  });
}

describe('WorldBrain runtime truth wiring', () => {
  it('runs WorldBrain through registry ports into snapshot and persistence sinks', () => {
    const shell = new WorldTickThinShell();
    registerProvider(shell);
    shell.registerChunk('0:0');

    const queuedBefore = shell.getPersistenceStats().queuedEvents;

    shell.tick();

    const worldBrainSnapshot = shell.getWorldBrainSnapshot();

    expect(shell.getTickCount()).toBe(1);
    expect(worldBrainSnapshot.active_chunks).toEqual(['0:0']);
    expect(worldBrainSnapshot.layer_states.size).toBe(1);
    expect(worldBrainSnapshot.world_hash).not.toBe('0'.repeat(64));
    expect(shell.getSnapshotStats().chunkCount).toBe(1);
    expect(shell.getPersistenceStats().queuedEvents).toBeGreaterThan(queuedBefore);
  });

  it('does not require the legacy WorldBrainScheduler direct tick path', () => {
    const shell = new WorldTickThinShell();
    registerProvider(shell);
    shell.registerChunk('2:3');

    expect(() => shell.tick()).not.toThrow();
    expect(shell.getWorldBrainSnapshot().active_chunks).toEqual(['2:3']);
  });
});
