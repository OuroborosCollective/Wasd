import { describe, expect, it } from 'vitest';
import { TickSystemRegistry } from '../TickSystemRegistry.js';
import { WorldTickThinShell } from '../WorldTickThinShell.js';

function isolatedShell(): WorldTickThinShell {
  return new WorldTickThinShell({
    registry: new TickSystemRegistry(),
    worldSeed: 'failure-boundary-regression',
  });
}

describe('WorldTickThinShell failure boundary', () => {
  it('keeps direct tick fail-hard for missing runtime truth and records the failed tick', () => {
    const shell = isolatedShell();
    shell.registerChunk('0:0');

    expect(() => shell.tick()).toThrow('MISSING_RUNTIME_SOURCE');

    const snapshot = shell.getFailureFamilyStatus();
    expect(shell.getTickCount()).toBe(1);
    expect(snapshot.totalOccurrences).toBe(1);
    expect(snapshot.lastFailureTick).toBe(1);
    expect(snapshot.records[0]).toMatchObject({
      family: 'runtime_source',
      stage: 'world_state',
      code: 'MISSING_RUNTIME_SOURCE',
      firstTick: 1,
      lastTick: 1,
    });
  });

  it('wraps a throwing provider with provider identity so the origin is preserved', () => {
    const shell = isolatedShell();
    shell.registerChunk('0:0');
    shell.registerWorldStateProvider({
      id: 'broken-player-runtime',
      getWorldState: () => {
        throw new Error('backend read failed');
      },
    });

    expect(() => shell.tick()).toThrow('WorldStateProvider "broken-player-runtime" failed');

    const record = shell.getFailureFamilyStatus().records[0];
    expect(record.family).toBe('runtime_source');
    expect(record.code).toBe('WORLD_STATE_PROVIDER_FAILURE');
    expect(record.provider).toBe('broken-player-runtime');
    expect(record.normalizedMessage).toContain('broken-player-runtime');
  });

  it('scheduled 100ms execution consumes a failed tick without leaking an unhandled exception', () => {
    const shell = isolatedShell();
    shell.registerChunk('0:0');

    expect(() => (shell as any).runScheduledTick()).not.toThrow();
    expect(shell.getTickCount()).toBe(1);
    const snapshot = shell.getFailureFamilyStatus();
    expect(snapshot.lastFailureTick).toBe(1);
    expect(snapshot.records[0].family).toBe('runtime_source');

    // A later scheduled slot is a distinct failed tick; no fake state is reused.
    expect(() => (shell as any).runScheduledTick()).not.toThrow();
    expect(shell.getTickCount()).toBe(2);
    const rerunSnapshot = shell.getFailureFamilyStatus();
    expect(rerunSnapshot.totalOccurrences).toBe(2);
    expect(rerunSnapshot.records[0].occurrenceCount).toBe(2);
    expect(rerunSnapshot.records[0].lastTick).toBe(2);
  });
});
