import { describe, expect, it } from 'vitest';
import { EmergentThermalAdapter } from '../modules/npc/EmergentThermalAdapter';
import { type AREBrainInput } from '../modules/npc/EmergentBrain';
import { type EnergyState } from '../modules/npc/ThermalLogic';

function brainInput(overrides: Partial<AREBrainInput> = {}): AREBrainInput {
  return {
    npcId: 'npc:thermal-guardian',
    factionId: 'heroes',
    traits: { faith: 0.95, aggression: 0.1, curiosity: 0.3 },
    energy: 1,
    memoryHash: 'memory:thermal',
    localStateHash: 'state:grove',
    playerDeltaDrift: 0.9,
    playerThreat: 0.05,
    colonyUtility: 0.95,
    resourcePressure: 0.1,
    tick: 1000,
    ...overrides,
  };
}

function energyState(overrides: Partial<EnergyState> = {}): EnergyState {
  return {
    currentEnergy: 800,
    maxEnergy: 1000,
    decayRate: 1,
    lastUpdatedTick: 1000,
    ...overrides,
  };
}

describe('EmergentThermalAdapter', () => {
  it('passes stable thermal state through the brain and applies action cost', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput(),
      energyState: energyState(),
      currentTick: 1000,
    });

    expect(result.thermalStatus).toBe('STABLE');
    expect(result.brainDecision?.action).toBe('ANCHOR_BUFF');
    expect(result.finalAction).toBe('ANCHOR_BUFF');
    expect(result.actionAllowed).toBe(true);
    expect(result.consequence.risk).toBe('NONE');
    expect(result.consequence.survivalBias).toBeCloseTo(0.2);
    expect(result.energyStats).toEqual({ before: 800, afterDecay: 800, afterAction: 788 });
    expect(result.decomposition).toBe(false);
  });

  it('keeps autonomy in critical state and reports risk instead of forcing harvest', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput({ resourcePressure: 0 }),
      energyState: energyState({ currentEnergy: 80 }),
      currentTick: 1000,
    });

    expect(result.thermalStatus).toBe('CRITICAL');
    expect(result.brainDecision).not.toBeNull();
    expect(result.finalAction).toBe(result.brainDecision?.action);
    expect(result.actionAllowed).toBe(true);
    expect(result.consequence.risk).toBe('CRITICAL');
    expect(result.consequence.survivalBias).toBeCloseTo(0.92);
    expect(result.consequence.collapseRisk).toBe(false);
    expect(result.reason).not.toBe('critical_energy_harvest_override');
  });

  it('marks collapse risk when a chosen action would consume remaining energy', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput({ resourcePressure: 0 }),
      energyState: energyState({ currentEnergy: 6, decayRate: 0 }),
      currentTick: 1000,
    });

    expect(result.brainDecision).not.toBeNull();
    expect(result.actionAllowed).toBe(true);
    expect(result.consequence.risk).toBe('COLLAPSE_IMMINENT');
    expect(result.consequence.collapseRisk).toBe(true);
    expect(result.energyStats.afterAction).toBe(0);
    expect(result.decomposition).toBe(true);
    expect(result.reason).toContain('thermal_risk');
  });

  it('returns decomposition without invoking a final brain action when energy reaches zero after decay', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput(),
      energyState: energyState({ currentEnergy: 5, decayRate: 5, lastUpdatedTick: 1000 }),
      currentTick: 1001,
    });

    expect(result.thermalStatus).toBe('DECOMPOSITION');
    expect(result.brainDecision).toBeNull();
    expect(result.finalAction).toBe('DECOMPOSITION');
    expect(result.actionAllowed).toBe(false);
    expect(result.consequence.allowed).toBe(false);
    expect(result.decomposition).toBe(true);
    expect(result.energyStats.afterDecay).toBe(0);
    expect(result.energyStats.afterAction).toBe(0);
  });

  it('feeds decayed energy ratio and survival bias into the brain input', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput({ playerDeltaDrift: 0.1, playerThreat: 0.8, colonyUtility: 0.2 }),
      energyState: energyState({ currentEnergy: 500, decayRate: 5, lastUpdatedTick: 1000 }),
      currentTick: 1010,
    });

    expect(result.energyStats.afterDecay).toBe(400);
    expect(result.consequence.survivalBias).toBeCloseTo(0.6);
    expect(result.brainDecision?.nextEnergy).toBeLessThanOrEqual(400);
  });
});
