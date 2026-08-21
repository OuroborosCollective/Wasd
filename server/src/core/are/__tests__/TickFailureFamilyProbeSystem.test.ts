import { describe, expect, it } from 'vitest';
import { TickSystemRegistry } from '../TickSystemRegistry.js';
import { WorldTickThinShell } from '../WorldTickThinShell.js';
import {
  DEFAULT_FAILURE_FAMILY_PROBE_CASES,
  TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME,
} from '../TickFailureFamilyProbeSystem.js';

function makeRuntime(): { shell: WorldTickThinShell; registry: TickSystemRegistry } {
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
  return { shell, registry };
}

describe('10Hz failure-family probe runtime', () => {
  it('executes one family case per authoritative tick and reruns only the side-effect-free probe', () => {
    const { shell } = makeRuntime();
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

    // Deliberate diagnostic faults are evidence, not organic server sickness.
    expect(failures.status).toBe('clean');
    expect(failures.runtimeOccurrences).toBe(0);
    expect(failures.diagnosticOccurrences).toBe(DEFAULT_FAILURE_FAMILY_PROBE_CASES.length);
    expect(failures.lastHealthyTick).toBe(DEFAULT_FAILURE_FAMILY_PROBE_CASES.length);
    expect(failures.records.every((record) => record.origin === 'diagnostic_probe')).toBe(true);

    expect(failures.diagnosticFamilies.runtime_source).toBeGreaterThanOrEqual(1);
    expect(failures.diagnosticFamilies.state_invariant).toBeGreaterThanOrEqual(1);
    expect(failures.diagnosticFamilies.determinism).toBeGreaterThanOrEqual(1);
    expect(failures.diagnosticFamilies.persistence).toBeGreaterThanOrEqual(1);
    expect(failures.diagnosticFamilies.ordering).toBeGreaterThanOrEqual(1);
    expect(failures.diagnosticFamilies.system_exception).toBeGreaterThanOrEqual(1);
    expect(failures.records.every((record) => record.derivationRerunMatches)).toBe(true);
    expect(failures.records.every((record) => record.runId === 'regression-full-run')).toBe(true);

    for (const probeCase of DEFAULT_FAILURE_FAMILY_PROBE_CASES) {
      const record = failures.records.find((entry) => entry.caseId === probeCase.caseId);
      expect(record?.family).toBe(probeCase.family);
    }

    const transient = failures.records.find((record) => record.caseId === 'transient-system-recovery');
    expect(transient?.lastRerunOutcome).toBe('recovered');
    for (const probeCase of DEFAULT_FAILURE_FAMILY_PROBE_CASES.filter((entry) => entry.mode === 'reproduce')) {
      const record = failures.records.find((entry) => entry.caseId === probeCase.caseId);
      expect(record?.lastRerunOutcome).toBe('reproduced');
      expect(record?.rerunAttempts).toBe(1);
    }
  });

  it('keeps every non-probe TickSystem on the default never-rerun policy', () => {
    const { registry } = makeRuntime();
    const snapshot = registry.getRegistrationSnapshot();
    const retryEnabled = snapshot.filter((entry) => entry.failureRerunPolicy === 'safe_same_context_once');

    expect(retryEnabled).toHaveLength(1);
    expect(retryEnabled[0].name).toBe(TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME);
    expect(
      snapshot
        .filter((entry) => entry.name !== TICK_FAILURE_FAMILY_PROBE_SYSTEM_NAME)
        .every((entry) => entry.failureRerunPolicy === 'never'),
    ).toBe(true);
  });

  it('does not arm a second run over an active run', () => {
    const { shell } = makeRuntime();
    const first = shell.armFailureFamilyRun('first');
    const second = shell.armFailureFamilyRun('second');
    expect(first.runId).toBe('first');
    expect(second.runId).toBe('first');
    expect(second.queuedCases).toBe(first.queuedCases);
  });
});
