import { describe, expect, it } from 'vitest';
import { TickSystemRegistry } from '../TickSystemRegistry.js';
import { WorldTickThinShell } from '../WorldTickThinShell.js';
import { DEFAULT_FAILURE_FAMILY_PROBE_CASES } from '../TickFailureFamilyProbeSystem.js';

function makeShell(): WorldTickThinShell {
  const registry = new TickSystemRegistry();
  const shell = new WorldTickThinShell({ registry, worldSeed: 'failure-family-regression' });
  shell.registerWorldStateProvider({
    id: 'regression-runtime',
    getWorldState: () => ({
      players: [{ id: 'player-regression', position: { x: 0, y: 0, z: 0 }, state: 'idle' }],
      npcs: [],
      loot: [],
    }),
  });
  shell.registerChunk('0:0');
  return shell;
}

describe('10Hz failure-family probe runtime', () => {
  it('executes one family case per authoritative tick and reruns only the side-effect-free probe', () => {
    const shell = makeShell();
    const armed = shell.armFailureFamilyRun('regression-full-run');
    expect(armed.active).toBe(true);
    expect(armed.totalCases).toBe(DEFAULT_FAILURE_FAMILY_PROBE_CASES.length);

    for (let index = 0; index < DEFAULT_FAILURE_FAMILY_PROBE_CASES.length; index += 1) {
      expect(() => shell.tick()).not.toThrow();
    }

    const probe = shell.getFailureFamilyProbeStatus();
    const failures = shell.getFailureFamilyStatus();
    expect(shell.getTickCount()).toBe(DEFAULT_FAILURE_FAMILY_PROBE_CASES.length);
    expect(probe.active).toBe(false);
    expect(probe.completedCases).toBe(DEFAULT_FAILURE_FAMILY_PROBE_CASES.length);
    expect(probe.queuedCases).toBe(0);

    expect(failures.families.runtime_source).toBeGreaterThanOrEqual(1);
    expect(failures.families.state_invariant).toBeGreaterThanOrEqual(1);
    expect(failures.families.determinism).toBeGreaterThanOrEqual(1);
    expect(failures.families.persistence).toBeGreaterThanOrEqual(1);
    expect(failures.families.ordering).toBeGreaterThanOrEqual(1);
    expect(failures.families.system_exception).toBeGreaterThanOrEqual(1);
    expect(failures.records.every((record) => record.derivationRerunMatches)).toBe(true);
    expect(failures.records.every((record) => record.runId === 'regression-full-run')).toBe(true);

    const transient = failures.records.find((record) => record.caseId === 'transient-system-recovery');
    expect(transient?.lastRerunOutcome).toBe('recovered');
    for (const probeCase of DEFAULT_FAILURE_FAMILY_PROBE_CASES.filter((entry) => entry.mode === 'reproduce')) {
      const record = failures.records.find((entry) => entry.caseId === probeCase.caseId);
      expect(record?.lastRerunOutcome).toBe('reproduced');
      expect(record?.rerunAttempts).toBe(1);
    }
  });

  it('does not arm a second run over an active run', () => {
    const shell = makeShell();
    const first = shell.armFailureFamilyRun('first');
    const second = shell.armFailureFamilyRun('second');
    expect(first.runId).toBe('first');
    expect(second.runId).toBe('first');
    expect(second.queuedCases).toBe(first.queuedCases);
  });
});
