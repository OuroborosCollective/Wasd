// @ARE-GUARD-EXEMPT: Testing logic only.
import { describe, expect, it } from 'vitest';
import { ARECycle } from '../ARECycle';
import { AREDivergenceGuard } from '../AREDivergenceGuard';
import { AREPayloadFactory } from '../AREPayload';
import { AREReplayBuffer } from '../AREReplayBuffer';

function recordAt(buffer: AREReplayBuffer, tick: number, entityId = 'entity:1') {
  // position {x:1, y:2, z:0} -> Kappa {x:1000, y:2000, z:0}
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

    // recordAt is at x=1 (1000 Kappa).
    // thresholds in Kappa:
    const guard = new AREDivergenceGuard({ warn: 100, critical: 1000 });

    // x=1.05 => 0.05 units = 50 Kappa diff. Magnitude = 50. Status 'ok'.
    // x=1.15 => 0.15 units = 150 Kappa diff. Magnitude = 150. Status 'warn'.
    const warnSample = guard.measure(10, 'entity:1', { x: 1.15, y: 2, z: 0 }, buffer);
    expect(warnSample?.status).toBe('warn');

    // x=2.1 => 1.1 units = 1100 Kappa diff. Magnitude = 1100. Status 'critical'.
    const criticalSample = guard.measure(10, 'entity:1', { x: 2.1, y: 2, z: 0 }, buffer);
    expect(criticalSample?.status).toBe('critical');

    expect(guard.summarize().status).toBe('critical');
    expect(guard.summarize().critical).toBe(1);
    expect(guard.summarize().warn).toBe(1);
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
