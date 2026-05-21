import { describe, expect, it } from 'vitest';
import { ARECycle } from '../ARECycle';
import { AREDivergenceGuard } from '../AREDivergenceGuard';
import { AREPayloadFactory } from '../AREPayload';
import { AREReplayBuffer } from '../AREReplayBuffer';

function recordAt(buffer: AREReplayBuffer, tick: number, entityId = 'entity:1') {
  const genesis = AREPayloadFactory.createNormalized(entityId, { x: 1, y: 2, z: 0 }, { x: 0, y: 0, z: 0 });
  const next = ARECycle.processCycle(genesis);
  return buffer.record(tick, next);
}

describe('ARE-Logic: divergence guard', () => {
  it('measures zero drift when legacy and ARE kappa positions match', () => {
    const buffer = new AREReplayBuffer(5);
    const entry = recordAt(buffer, 10);
    const guard = new AREDivergenceGuard({ warn: 1000, critical: 10000 });

    const sample = guard.measure(10, 'entity:1', { x: entry.payload.position.x / 1000, y: entry.payload.position.y / 1000, z: 0 }, buffer);

    expect(sample?.status).toBe('ok');
    expect(sample?.magnitude).toBe(0);
    expect(guard.summarize().status).toBe('ok');
  });

  it('reports warn and critical thresholds without throwing', () => {
    const buffer = new AREReplayBuffer(5);
    recordAt(buffer, 10);

    // 1 unit diff = 1000 Kappa.
    // recordAt is at x=1 (1000 Kappa).
    const guard = new AREDivergenceGuard({ warn: 500, critical: 5000 });

    const warn = guard.measure(10, 'entity:1', { x: 1.6, y: 2, z: 0 }, buffer); // 600 Kappa diff
    const critical = guard.measure(10, 'entity:1', { x: 7, y: 2, z: 0 }, buffer); // 6000 Kappa diff

    expect(warn?.status).toBe('warn');
    expect(critical?.status).toBe('critical');
    expect(guard.summarize().status).toBe('critical');
    expect(guard.summarize().critical).toBe(1);
  });

  it('returns null when no matching replay entry exists', () => {
    const buffer = new AREReplayBuffer(5);
    const guard = new AREDivergenceGuard();
    expect(guard.measure(1, 'missing', { x: 0, y: 0, z: 0 }, buffer)).toBeNull();
  });

  it('keeps bounded telemetry samples', () => {
    const buffer = new AREReplayBuffer(5);
    recordAt(buffer, 1);
    const guard = new AREDivergenceGuard({ warn: 1, critical: 2 }, 2);

    guard.measure(1, 'entity:1', { x: 1, y: 2, z: 0 }, buffer);
    guard.measure(1, 'entity:1', { x: 2, y: 2, z: 0 }, buffer);
    guard.measure(1, 'entity:1', { x: 3, y: 2, z: 0 }, buffer);

    expect(guard.summarize().samples).toBe(2);
  });

  it('rejects invalid legacy positions as measurement errors', () => {
    const buffer = new AREReplayBuffer(5);
    recordAt(buffer, 10);
    const guard = new AREDivergenceGuard();

    expect(() => guard.measure(10, 'entity:1', { x: 'bad' }, buffer)).toThrow('[ARE-Divergence]');
  });
});
