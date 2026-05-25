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
    expect(result.energyStats).toEqual({ before: 800, afterDecay: 800, afterAction: 788 });
    expect(result.decomposition).toBe(false);
  });

  it('forces critical entities to harvest resources regardless of the brain action', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput({ resourcePressure: 0 }),
      energyState: energyState({ currentEnergy: 80 }),
      currentTick: 1000,
    });

    expect(result.thermalStatus).toBe('CRITICAL');
    expect(result.brainDecision?.action).not.toBe('HARVEST_RESOURCE');
    expect(result.finalAction).toBe('HARVEST_RESOURCE');
    expect(result.energyStats.afterAction).toBe(80);
    expect(result.reason).toBe('critical_energy_harvest_override');
  });

  it('returns decomposition without invoking a final brain action when energy reaches zero', () => {
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
    expect(result.decomposition).toBe(true);
    expect(result.energyStats.afterDecay).toBe(0);
    expect(result.energyStats.afterAction).toBe(0);
  });

  it('feeds decayed energy ratio into the brain input', () => {
    const adapter = new EmergentThermalAdapter();

    const result = adapter.process({
      brainInput: brainInput({ playerDeltaDrift: 0.1, playerThreat: 0.8, colonyUtility: 0.2 }),
      energyState: energyState({ currentEnergy: 500, decayRate: 5, lastUpdatedTick: 1000 }),
      currentTick: 1010,
    });

    expect(result.energyStats.afterDecay).toBe(400);
    expect(result.brainDecision?.nextEnergy).toBeLessThanOrEqual(400);
  });
});
