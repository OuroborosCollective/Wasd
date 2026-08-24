import { describe, expect, it } from 'vitest';
import { createDefaultTickContext, TickSystemPriority, type TickSystem } from '../TickSystem.js';
import { TickSystemRegistry, type TickSystemRegistryEvent } from '../TickSystemRegistry.js';

function codedError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

describe('TickSystemRegistry failure evidence + rerun safety', () => {
  it('stamps a thrown system error with the actual 10Hz tick and deterministic derivation', () => {
    const registry = new TickSystemRegistry();
    const events: TickSystemRegistryEvent[] = [];
    registry.subscribe((event) => events.push(event));
    registry.register({
      system: {
        name: 'failing-system',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: () => { throw codedError('STATE_INVARIANT', 'non-finite kappa state'); },
      },
      dependencies: [],
      tags: ['gameplay'],
    });

    const report = registry.executeAll(createDefaultTickContext(37));
    const event = events.find((candidate) => candidate.type === 'system_error');

    expect(report.tick).toBe(37);
    expect(report.failures).toHaveLength(1);
    expect(event?.type).toBe('system_error');
    if (event?.type !== 'system_error') throw new Error('system_error event missing');
    expect(event.tick).toBe(37);
    expect(event.failure.family).toBe('state_invariant');
    expect(event.failure.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(event.failure.derivationRerunMatches).toBe(true);
    expect(event.rerunOutcome).toBe('not_eligible');
  });

  it('never reruns an ordinary authoritative system by default', () => {
    const registry = new TickSystemRegistry();
    let calls = 0;
    const system: TickSystem = {
      name: 'authoritative-mutation',
      priority: TickSystemPriority.GAMEPLAY,
      enabled: true,
      tick: () => {
        calls += 1;
        throw codedError('SYSTEM_EXCEPTION', 'mutation failed after partial write');
      },
    };
    registry.register({ system, dependencies: [], tags: ['gameplay'] });

    registry.executeAll(createDefaultTickContext(4));

    expect(calls).toBe(1);
    const failure = registry.getFailureRuntime().getSnapshot().records[0];
    expect(failure.rerunEligible).toBe(false);
    expect(failure.rerunAttempts).toBe(0);
  });

  it('reruns exactly once when a system explicitly proves same-context retry safety and can recover', () => {
    const registry = new TickSystemRegistry();
    let calls = 0;
    registry.register({
      system: {
        name: 'rerun-safe-probe',
        priority: TickSystemPriority.BACKGROUND,
        enabled: true,
        tick: () => {
          calls += 1;
          if (calls === 1) throw codedError('TRANSIENT_SYSTEM_FAILURE', 'transient probe');
        },
      },
      dependencies: [],
      tags: ['diagnostic', 'rerun-safe'],
      failurePolicy: { rerun: 'safe_same_context_once' },
    });

    const report = registry.executeAll(createDefaultTickContext(9));
    const failure = registry.getFailureRuntime().getSnapshot().records[0];

    expect(calls).toBe(2);
    expect(report.failures[0].rerunOutcome).toBe('recovered');
    expect(failure.rerunAttempts).toBe(1);
    expect(failure.lastRerunOutcome).toBe('recovered');
  });

  it('distinguishes deterministic reproduction from a changed failure on rerun', () => {
    const reproduced = new TickSystemRegistry();
    let reproducedCalls = 0;
    reproduced.register({
      system: {
        name: 'reproducing-probe',
        priority: TickSystemPriority.BACKGROUND,
        enabled: true,
        tick: () => {
          reproducedCalls += 1;
          throw codedError('DETERMINISM_DIVERGENCE', 'same divergence');
        },
      },
      dependencies: [],
      tags: ['diagnostic'],
      failurePolicy: { rerun: 'safe_same_context_once' },
    });
    const reproducedReport = reproduced.executeAll(createDefaultTickContext(12));
    expect(reproducedCalls).toBe(2);
    expect(reproducedReport.failures[0].rerunOutcome).toBe('reproduced');

    const changed = new TickSystemRegistry();
    let changedCalls = 0;
    changed.register({
      system: {
        name: 'changing-probe',
        priority: TickSystemPriority.BACKGROUND,
        enabled: true,
        tick: () => {
          changedCalls += 1;
          if (changedCalls === 1) throw codedError('STATE_INVARIANT', 'first family');
          throw codedError('PERSISTENCE_UNAVAILABLE', 'different family');
        },
      },
      dependencies: [],
      tags: ['diagnostic'],
      failurePolicy: { rerun: 'safe_same_context_once' },
    });
    const changedReport = changed.executeAll(createDefaultTickContext(13));
    expect(changedCalls).toBe(2);
    expect(changedReport.failures[0].rerunOutcome).toBe('changed_failure');
  });

  it('continues to later systems after an unrecovered failure', () => {
    const registry = new TickSystemRegistry();
    const calls: string[] = [];
    registry.register({
      system: {
        name: 'bad',
        priority: TickSystemPriority.INFRASTRUCTURE,
        enabled: true,
        tick: () => { calls.push('bad'); throw codedError('SYSTEM_EXCEPTION', 'boom'); },
      },
      dependencies: [],
      tags: [],
    });
    registry.register({
      system: {
        name: 'later',
        priority: TickSystemPriority.GAMEPLAY,
        enabled: true,
        tick: () => { calls.push('later'); },
      },
      dependencies: [],
      tags: [],
    });

    registry.executeAll(createDefaultTickContext(2));
    expect(calls).toEqual(['bad', 'later']);
  });
});
