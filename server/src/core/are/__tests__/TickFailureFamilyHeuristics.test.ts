import { describe, expect, it } from 'vitest';
import { deriveTickFailure } from '../TickFailureFamilyRuntime.js';

describe('TickFailureFamily generic-error refinement', () => {
  it('refines untyped system errors before falling back to system_exception', () => {
    expect(deriveTickFailure({
      tick: 10,
      stage: 'system_tick',
      system: 'manifest',
      error: new Error('world hash mismatch after replay divergence'),
    }).family).toBe('determinism');

    expect(deriveTickFailure({
      tick: 11,
      stage: 'system_tick',
      system: 'economy',
      error: new Error('database persistence write failed'),
    }).family).toBe('persistence');

    expect(deriveTickFailure({
      tick: 12,
      stage: 'system_tick',
      system: 'registry',
      error: new Error('required tick system dependency order violation'),
    }).family).toBe('ordering');

    expect(deriveTickFailure({
      tick: 13,
      stage: 'system_tick',
      system: 'combat',
      error: new Error('non-finite kappa invariant'),
    }).family).toBe('state_invariant');

    expect(deriveTickFailure({
      tick: 14,
      stage: 'system_tick',
      system: 'combat',
      error: new Error('something exploded'),
    }).family).toBe('system_exception');
  });

  it('keeps explicit snapshot determinism more specific than the generic snapshot boundary fallback', () => {
    const explicit = new Error('world hash diverged') as Error & { code: string };
    explicit.code = 'DETERMINISM_DIVERGENCE';

    expect(deriveTickFailure({
      tick: 20,
      stage: 'snapshot_finalize',
      error: new Error('snapshot exploded'),
    }).family).toBe('state_invariant');

    expect(deriveTickFailure({
      tick: 21,
      stage: 'snapshot_finalize',
      error: explicit,
    }).family).toBe('determinism');
  });
});
