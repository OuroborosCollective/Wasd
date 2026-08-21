import { describe, expect, it } from 'vitest';
import {
  TickFailureFamilyRuntime,
  deriveTickFailure,
  type TickFailureFamily,
} from '../TickFailureFamilyRuntime.js';

function codedError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function probeError(runId: string, caseId: string): Error & {
  code: string;
  failureFamilyRunId: string;
  failureFamilyCaseId: string;
} {
  const error = codedError('DETERMINISM_DIVERGENCE', 'same diagnostic divergence') as Error & {
    code: string;
    failureFamilyRunId: string;
    failureFamilyCaseId: string;
  };
  error.failureFamilyRunId = runId;
  error.failureFamilyCaseId = caseId;
  return error;
}

describe('TickFailureFamilyRuntime', () => {
  it.each([
    ['MISSING_RUNTIME_SOURCE', 'runtime_source'],
    ['STATE_INVARIANT', 'state_invariant'],
    ['DETERMINISM_DIVERGENCE', 'determinism'],
    ['PERSISTENCE_UNAVAILABLE', 'persistence'],
    ['TICK_ORDER_VIOLATION', 'ordering'],
    ['TRANSIENT_SYSTEM_FAILURE', 'system_exception'],
  ] as const)('derives %s as %s', (code, family) => {
    const derived = deriveTickFailure({
      tick: 42,
      stage: code === 'MISSING_RUNTIME_SOURCE' ? 'world_state' : 'system_tick',
      system: 'test-system',
      error: codedError(code, `failure ${code} at tick 42`),
    });

    expect(derived.family).toBe(family);
    expect(derived.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('classifies hard boundary stages before the generic SYSTEM_EXCEPTION fallback code', () => {
    const persistence = deriveTickFailure({
      tick: 5,
      stage: 'persistence_tick',
      error: new Error('adapter write exploded'),
    });
    const provider = deriveTickFailure({
      tick: 6,
      stage: 'world_state',
      provider: 'runtime-provider',
      error: new Error('read exploded'),
    });
    const snapshot = deriveTickFailure({
      tick: 7,
      stage: 'snapshot_finalize',
      error: new Error('snapshot invariant exploded'),
    });

    expect(persistence.code).toBe('SYSTEM_EXCEPTION');
    expect(persistence.family).toBe('persistence');
    expect(persistence.signals).toContain('stage:persistence_tick');
    expect(provider.family).toBe('runtime_source');
    expect(provider.signals).toContain('stage:world_state');
    expect(snapshot.family).toBe('state_invariant');
  });

  it('normalizes volatile numbers so repeated failures aggregate into one family record', () => {
    const runtime = new TickFailureFamilyRuntime();
    runtime.recordFailure({
      tick: 10,
      stage: 'system_tick',
      system: 'economy',
      error: codedError('SYSTEM_EXCEPTION', 'ledger row 123 failed at tick 10'),
    });
    runtime.recordFailure({
      tick: 11,
      stage: 'system_tick',
      system: 'economy',
      error: codedError('SYSTEM_EXCEPTION', 'ledger row 999 failed at tick 11'),
    });

    const snapshot = runtime.getSnapshot();
    expect(snapshot.distinctFailures).toBe(1);
    expect(snapshot.totalOccurrences).toBe(2);
    expect(snapshot.records[0].occurrenceCount).toBe(2);
    expect(snapshot.records[0].firstTick).toBe(10);
    expect(snapshot.records[0].lastTick).toBe(11);
    expect(snapshot.records[0].derivationRerunMatches).toBe(true);
  });

  it('keeps a stable fingerprint across diagnostic runs while preserving first and latest run provenance', () => {
    const runtime = new TickFailureFamilyRuntime();
    runtime.recordFailure({
      tick: 20,
      stage: 'system_tick',
      system: 'failure-family-probe',
      error: probeError('run-one', 'determinism-divergence'),
      rerunEligible: true,
    });
    runtime.recordFailure({
      tick: 40,
      stage: 'system_tick',
      system: 'failure-family-probe',
      error: probeError('run-two', 'determinism-divergence'),
      rerunEligible: true,
    });

    const snapshot = runtime.getSnapshot();
    expect(snapshot.distinctFailures).toBe(1);
    expect(snapshot.totalOccurrences).toBe(2);
    expect(snapshot.records[0]).toMatchObject({
      runId: 'run-one',
      caseId: 'determinism-divergence',
      lastRunId: 'run-two',
      lastCaseId: 'determinism-divergence',
      firstTick: 20,
      lastTick: 40,
      occurrenceCount: 2,
    });
  });

  it('records rerun recovery without inventing a second failure occurrence', () => {
    const runtime = new TickFailureFamilyRuntime();
    const failure = runtime.recordFailure({
      tick: 7,
      stage: 'system_tick',
      system: 'probe',
      error: codedError('TRANSIENT_SYSTEM_FAILURE', 'transient diagnostic failure'),
      rerunEligible: true,
    });

    runtime.recordRerunOutcome({
      fingerprint: failure.fingerprint,
      tick: 7,
      outcome: 'recovered',
      stage: 'system_tick',
      system: 'probe',
    });

    const record = runtime.getSnapshot().records[0];
    expect(record.occurrenceCount).toBe(1);
    expect(record.rerunAttempts).toBe(1);
    expect(record.lastRerunOutcome).toBe('recovered');
  });

  it('covers every declared production failure family except unknown with an explicit code', () => {
    const families = new Set<TickFailureFamily>();
    for (const [code, stage] of [
      ['MISSING_RUNTIME_SOURCE', 'world_state'],
      ['SYSTEM_EXCEPTION', 'system_tick'],
      ['STATE_INVARIANT', 'system_tick'],
      ['DETERMINISM_DIVERGENCE', 'system_tick'],
      ['PERSISTENCE_UNAVAILABLE', 'persistence_tick'],
      ['TICK_ORDER_VIOLATION', 'system_tick'],
    ] as const) {
      families.add(deriveTickFailure({ tick: 1, stage, error: codedError(code, code) }).family);
    }

    expect([...families].sort()).toEqual([
      'determinism',
      'ordering',
      'persistence',
      'runtime_source',
      'state_invariant',
      'system_exception',
    ]);
  });
});
