// @ARE-GUARD-EXEMPT: Testing logic only.
import { describe, expect, it } from 'vitest';
import { AREDivergenceGuard } from '../AREDivergenceGuard';

describe('AREDivergenceGuard', () => {
  it('correctly calculates status based on magnitude', () => {
    const guard = new AREDivergenceGuard({ warn: 100, critical: 1000 });
    const buffer = {
      get: () => ({ payload: { position: { x: 0, y: 0, z: 0 } }, stateHash: 0 }),
      latest: () => null
    } as any;

    // Magnitude 50 => ok
    const ok = guard.measure(1, 'e1', { x: 0.05, y: 0, z: 0 }, buffer);
    expect(ok?.status).toBe('ok');

    // Magnitude 150 => warn
    const warn = guard.measure(1, 'e1', { x: 0.15, y: 0, z: 0 }, buffer);
    expect(warn?.status).toBe('warn');

    // Magnitude 1100 => critical
    const critical = guard.measure(1, 'e1', { x: 1.1, y: 0, z: 0 }, buffer);
    expect(critical?.status).toBe('critical');

    expect(guard.summarize().status).toBe('critical');
  });
});
